import { toast } from "@heroui/react"
import { MapPin, Navigation2 } from "lucide-react"
import * as maplibregl from "maplibre-gl"
import workerSource from "maplibre-gl/dist/maplibre-gl-worker.mjs?raw"
import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef } from "react"
import type { GpsFix, GpsStatus } from "../hooks/useDrive"
import { mapStyle, mapZoom, mapZoomRange } from "../parameters"
import { useSettingsStore } from "../stores/settingsStore"

// Vite must not transform MapLibre's already bundled worker as an app module.
maplibregl.setWorkerUrl(URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })))

type MapLabels = { showStreetNames: boolean; showPointsOfInterest: boolean }
type MiniMap = MapLabels & { position: GpsFix | null; status: GpsStatus; dark: boolean; onBearingChange: (bearing: number) => void }

function addPointsOfInterestLayer(map: maplibregl.Map, dark: boolean) {
	// Positron omits POI labels. Use the same OpenMapTiles layer in both themes.
	const streetNames = map.getStyle().layers.find((layer) => layer.type === "symbol" && layer["source-layer"] === "transportation_name")
	if (!streetNames || streetNames.type !== "symbol") return

	const accentColor = getComputedStyle(map.getContainer()).getPropertyValue("--accent").trim()
	map.addLayer({
		id: "minimap-poi",
		type: "symbol",
		source: streetNames.source,
		"source-layer": "poi",
		filter: ["all", ["has", "name"], ["<=", ["coalesce", ["get", "rank"], 0], 10]],
		layout: {
			visibility: "none",
			"text-field": ["concat", "• ", ["get", "name"]],
			"text-font": ["Noto Sans Regular"],
			"text-size": 12,
			"symbol-sort-key": ["coalesce", ["get", "rank"], 0]
		},
		paint: {
			"text-color": accentColor,
			"text-halo-color": dark ? "#111827" : "#fff",
			"text-halo-width": 1
		}
	})
}

function updateMapLabels(map: maplibregl.Map, labels: MapLabels) {
	for (const layer of map.getStyle().layers) {
		if (layer.type !== "symbol" && !layer.id.toLowerCase().includes("poi")) continue
		const isStreetName = layer.type === "symbol" && layer["source-layer"] === "transportation_name" && layer.layout?.["text-field"] !== undefined && layer.layout["icon-image"] === undefined
		const visible = (labels.showStreetNames && isStreetName) || (labels.showPointsOfInterest && layer.id === "minimap-poi")
		const visibility = visible ? "visible" : "none"
		if ((layer.layout?.visibility ?? "visible") !== visibility) map.setLayoutProperty(layer.id, "visibility", visibility)
	}
}

export function MiniMap(props: MiniMap) {
	const zoom = useSettingsStore((state) => state.settings.mapZoom)
	const setMapZoom = useSettingsStore((state) => state.setMapZoom)
	const container = useRef<HTMLDivElement>(null)
	const map = useRef<maplibregl.Map | null>(null)
	const styleReady = useRef(false)

	const coords = props.position?.coords

	const initialPosition = useRef(coords)
	initialPosition.current = coords
	const currentTheme = useRef(props.dark)

	const { showStreetNames, showPointsOfInterest, onBearingChange } = props
	const labels = useRef({ showStreetNames, showPointsOfInterest })
	labels.current = { showStreetNames, showPointsOfInterest }

	const hasPosition = !!coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)

	useEffect(() => {
		if (!hasPosition || !container.current || !initialPosition.current) return

		const { longitude, latitude } = initialPosition.current
		let reportedError = false

		const instance = new maplibregl.Map({
			container: container.current,
			center: [longitude, latitude],
			zoom: useSettingsStore.getState().settings.mapZoom,
			minZoom: mapZoomRange.min,
			maxZoom: mapZoomRange.max,
			scrollZoom: { around: "center" },
			touchZoomRotate: { around: "center" },
			boxZoom: false,
			dragPan: false,
			dragRotate: false,
			keyboard: false,
			doubleClickZoom: false,
			touchPitch: false,
			bearingSnap: 0,
			attributionControl: false,
			style: mapStyle[currentTheme.current ? "dark" : "light"],
			transformStyle: (_, style) => {
				// OpenFreeMap's dark sprite is missing this texture. Use the layer's fill color.
				for (const layer of style.layers) {
					if (layer.type === "fill" && layer.paint?.["fill-pattern"] === "wood-pattern") delete layer.paint["fill-pattern"]
				}
				return style
			}
		})
		instance.touchZoomRotate.disableRotation()
		instance.on("zoomend", (event) => {
			if (!event.originalEvent) return
			const zoom = instance.getZoom()
			setMapZoom(Math.abs(zoom - mapZoom) < 0.000001 ? mapZoom : zoom)
		})

		instance.on("style.load", () => {
			styleReady.current = true
			addPointsOfInterestLayer(instance, currentTheme.current)
			updateMapLabels(instance, labels.current)
		})

		instance.on("error", ({ error }) => {
			if (error instanceof Error && error.name === "AbortError") return
			if (!reportedError) {
				reportedError = true
				toast.danger("Some map content could not be loaded.", { timeout: 5000 })
			}
		})

		map.current = instance
		const reportBearing = () => onBearingChange(instance.getBearing())
		instance.on("rotate", reportBearing)
		reportBearing()

		const canvas = instance.getCanvas()
		//canvas.style.borderRadius = "25%"
		canvas.style.maskImage = "linear-gradient(to right, transparent, black 25%, black 75%, transparent), linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)"
		canvas.style.maskComposite = "intersect"

		const updateSize = () => {
			instance.resize()
			instance.setPadding({ top: instance.getContainer().clientHeight / 2, bottom: 0, left: 0, right: 0 })
		}

		const resizeObserver = new ResizeObserver(updateSize)
		resizeObserver.observe(container.current)
		updateSize()

		return () => {
			resizeObserver.disconnect()
			instance.off("rotate", reportBearing)
			instance.remove()
			map.current = null
			styleReady.current = false
			onBearingChange(0)
		}
	}, [hasPosition, onBearingChange, setMapZoom])

	useEffect(() => {
		const instance = map.current
		if (instance && Math.abs(instance.getZoom() - zoom) >= 0.000001) instance.setZoom(zoom)
	}, [zoom])

	useEffect(() => {
		if (hasPosition && coords && !map.current?.isZooming()) {
			map.current?.easeTo({
				center: [coords.longitude, coords.latitude],
				...(coords.heading !== null && Number.isFinite(coords.heading) ? { bearing: coords.heading } : {}),
				duration: 700
			})
		}
	}, [hasPosition, coords?.latitude, coords?.longitude, coords?.heading])

	useEffect(() => {
		if (map.current && currentTheme.current !== props.dark) {
			currentTheme.current = props.dark
			styleReady.current = false
			map.current.setStyle(mapStyle[props.dark ? "dark" : "light"], { diff: false })
		}
	}, [props.dark, hasPosition])

	useEffect(() => {
		if (map.current && styleReady.current) updateMapLabels(map.current, { showStreetNames, showPointsOfInterest })
	}, [showStreetNames, showPointsOfInterest])

	return (
		<section aria-label="Current location map" className="absolute inset-0 overflow-hidden">
			{hasPosition ? (
				<>
					<div className={`absolute inset-0 ${props.dark ? "opacity-95" : "opacity-80"}`}>
						<div ref={container} className="size-full" />
					</div>
					<div className="pointer-events-none absolute left-1/2 top-3/4 -translate-x-1/2 -translate-y-1/2">
						<Navigation2 aria-hidden="true" size={30} className="fill-accent text-accent drop-shadow-md" />
					</div>
				</>
			) : (
				<div className="pointer-events-none absolute left-1/2 top-3/4 -translate-x-1/2 -translate-y-1/2">
					<div className="flex flex-col items-center justify-center gap-2 text-sm text-muted">
						<MapPin aria-hidden="true" size={20} />
						<span>{props.status === "error" ? "Location unavailable" : "Finding location…"}</span>
					</div>
				</div>
			)}
		</section>
	)
}
