import { Card, Chip, Separator } from "@heroui/react"
import { CircleArrowUp, SatelliteIcon, SearchSlash } from "lucide-react"
import { useCallback, useRef } from "react"
import type { GpsFix, GpsStatus } from "../hooks/useDrive"
import { compassDirections, mapZoom } from "../parameters"
import { speedUnitLabel, toDisplaySpeed, type SpeedUnit } from "../speed"
import { useSettingsStore } from "../stores/settingsStore"
import type { Trip } from "../trip"
import CountUp from "./CountUp"
import { EngineTelemetry } from "./EngineTelemetry"
import { MiniMap } from "./MiniMap"
import { TripSummary } from "./TripSummary"

type SpeedDisplay = {
	speed: number
	unit: SpeedUnit
	gear: number | null
	rpm: number
	idling: boolean
	maxRpm: number
	redZoneRpm: number
	position: GpsFix | null
	gpsStatus: GpsStatus
	dark: boolean
	showStreetNames: boolean
	showPointsOfInterest: boolean
	trip: Trip
}

export function SpeedDisplay(props: SpeedDisplay) {
	const hasCustomZoom = useSettingsStore((state) => state.settings.mapZoom !== mapZoom)
	const setMapZoom = useSettingsStore((state) => state.setMapZoom)
	const mapArea = useRef<HTMLDivElement>(null)
	const updateNorth = useCallback((mapBearing: number) => {
		mapArea.current?.style.setProperty("--map-north-rotation", `${-mapBearing}deg`)
	}, [])
	const coords = props.position?.coords
	const hasPosition = !!coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
	const heading = coords?.heading
	const bearing = props.gpsStatus === "connected" && typeof heading === "number" && Number.isFinite(heading) && heading >= 0 && heading <= 360 ? heading : null
	const direction = bearing === null ? null : compassDirections[Math.round(bearing / 45) % compassDirections.length]

	return (
		<Card className="min-h-0 min-w-0 flex-1 flex-col p-4 gap-2 lg:gap-6 grid landscape:grid-cols-2 landscape:lg:grid-cols-1 portrait:grid-cols-1 grid-rows-[minmax(0,1fr)] ">
			<div ref={mapArea} className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
				<MiniMap position={props.position} status={props.gpsStatus} dark={props.dark} showStreetNames={props.showStreetNames} showPointsOfInterest={props.showPointsOfInterest} onBearingChange={updateNorth} />

				<div className="relative flex gap-2 justify-between items-center">
					<div className="flex flex-wrap items-center gap-2">
						<Chip className="gap-2" variant="soft" color={props.gpsStatus === "connected" ? "success" : "warning"} size="lg">
							<SatelliteIcon size={15} />
							{props.gpsStatus === "connected" ? "GPS" : props.gpsStatus === "error" ? "GPS unavailable" : "Finding GPS"}
						</Chip>
						{hasPosition && hasCustomZoom && (
							<Chip variant="soft" color="warning" size="lg" className="cursor-pointer" aria-label="Reset map zoom" onClick={() => setMapZoom(mapZoom)}>
								<SearchSlash size={15} aria-hidden="true" /> Reset
							</Chip>
						)}
					</div>
					{props.gpsStatus === "connected" && (
						<Chip className="gap-2" variant="soft" size="lg">
							<CircleArrowUp size={15} role="img" aria-label="North on map" style={{ transform: "rotate(var(--map-north-rotation, 0deg))" }} />
							{direction ?? <span>—</span>}
						</Chip>
					)}
				</div>

				<div className="pointer-events-none absolute inset-x-0 top-1/3 -translate-y-1/2 flex-col items-center flex landscape:max-[50rem]:hidden">
					<div className="font-display text-4xl landscape:lg:text-7xl leading-none font-semibold tracking-tight">
						<CountUp end={Math.round(toDisplaySpeed(props.speed, props.unit))} duration={0.4} preserveValue />
					</div>
					<div className="landscape:lg:text-xl text-muted">{speedUnitLabel(props.unit)}</div>
				</div>
			</div>

			<div className="flex min-w-0 shrink-0 flex-col gap-4 h-lg:lg:gap-6 justify-end overflow-auto">
				<div className="flex-1 flex-col items-center justify-center hidden landscape:max-[50rem]:flex">
					<div className="font-display text-7xl leading-none font-semibold tracking-tight">
						<CountUp end={Math.round(toDisplaySpeed(props.speed, props.unit))} duration={0.4} preserveValue />
					</div>
					<div className="text-xl text-muted">{speedUnitLabel(props.unit)}</div>
				</div>
				<Separator className="shrink-0 " />
				<EngineTelemetry gear={props.gear} rpm={props.rpm} idling={props.idling} maxRpm={props.maxRpm} redZoneRpm={props.redZoneRpm} />
				<TripSummary trip={props.trip} unit={props.unit} />
			</div>
		</Card>
	)
}
