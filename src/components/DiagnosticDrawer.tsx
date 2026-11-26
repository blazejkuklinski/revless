import { Button, Card, Drawer } from "@heroui/react"
import { Clock3, Compass, Gauge, Globe, LocateFixed, Monitor, Mountain, MoveHorizontal, MoveVertical, Ruler, Satellite, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { GpsFix } from "../hooks/useDrive"
import { SystemMessage } from "./SystemMessage"

type GpsDrawer = {
	open: boolean
	placement: "left" | "right"
	onClose: () => void
	position: GpsFix | null
	message: string
}

function formatMeasurement(value: number | null, unit: string, decimals = 1) {
	return value !== null && Number.isFinite(value) ? `${value.toFixed(decimals)}${unit}` : "Unavailable"
}

function formatDimensions(width: number, height: number, decimals = 0) {
	return `${width.toFixed(decimals)} × ${height.toFixed(decimals)} CSS px`
}

function readScreenDiagnostics() {
	const { screen, visualViewport, devicePixelRatio } = window
	const { clientWidth, clientHeight } = document.documentElement

	return [
		["Layout viewport", formatDimensions(window.innerWidth, window.innerHeight)],
		["Visual viewport", visualViewport ? formatDimensions(visualViewport.width, visualViewport.height, 2) : "Unavailable"],
		["Device pixel ratio", String(devicePixelRatio)],
		["Visual viewport scale", visualViewport ? String(visualViewport.scale) : "Unavailable"],
		["Visual viewport offset (left, top)", visualViewport ? `${visualViewport.offsetLeft.toFixed(2)}, ${visualViewport.offsetTop.toFixed(2)} CSS px` : "Unavailable"],
		["Document client area", formatDimensions(clientWidth, clientHeight)],
		["Outer window", formatDimensions(window.outerWidth, window.outerHeight)],
		["Reported screen size", formatDimensions(screen.width, screen.height)],
		["Available screen area", formatDimensions(screen.availWidth, screen.availHeight)],
		["Screen orientation", screen.orientation ? `${screen.orientation.type} (${screen.orientation.angle}°)` : "Unavailable"],
		["CSS orientation", window.matchMedia("(orientation: landscape)").matches ? "Landscape" : "Portrait"],
		["Color depth", `${screen.colorDepth} bits`],
		["CSS fullscreen display mode", window.matchMedia("(display-mode: fullscreen)").matches ? "Yes" : "No"],
		["Page fullscreen element", document.fullscreenElement ? "Yes" : "No"]
	] as const
}

function readBrowserDiagnostics() {
	const browser = window.navigator as Navigator & {
		userAgentData?: {
			brands: readonly { brand: string; version: string }[]
			platform: string
			mobile: boolean
		}
	}
	const { userAgentData } = browser
	const brands = userAgentData?.brands.map(({ brand, version }) => `${brand} ${version}`).join(", ")

	return [
		["Browser brands and versions", brands || "Unavailable"],
		["Reported platform", userAgentData?.platform || browser.platform || "Unavailable"],
		["Mobile browser", userAgentData ? (userAgentData.mobile ? "Yes" : "No") : "Unavailable"],
		["Preferred languages", browser.languages?.join(", ") || browser.language || "Unavailable"],
		["Maximum touch points", String(browser.maxTouchPoints ?? "Unavailable")],
		["Secure context", window.isSecureContext ? "Yes" : "No"],
		["User agent", browser.userAgent || "Unavailable"]
	] as const
}

export function DiagnosticDrawer(props: GpsDrawer) {
	const [screenDiagnostics, setScreenDiagnostics] = useState<ReturnType<typeof readScreenDiagnostics>>()
	const browserDiagnostics = props.open ? readBrowserDiagnostics() : []

	useEffect(() => {
		if (!props.open) return

		const viewport = window.visualViewport
		const orientation = window.screen.orientation
		const fullscreenMode = window.matchMedia("(display-mode: fullscreen)")
		let resolutionQuery: MediaQueryList | undefined

		function updateScreenDiagnostics() {
			setScreenDiagnostics(readScreenDiagnostics())
			if (!resolutionQuery?.matches) {
				resolutionQuery?.removeEventListener("change", updateScreenDiagnostics)
				resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
				resolutionQuery.addEventListener("change", updateScreenDiagnostics)
			}
		}

		updateScreenDiagnostics()
		window.addEventListener("resize", updateScreenDiagnostics)
		viewport?.addEventListener("resize", updateScreenDiagnostics)
		viewport?.addEventListener("scroll", updateScreenDiagnostics)
		orientation?.addEventListener("change", updateScreenDiagnostics)
		fullscreenMode.addEventListener("change", updateScreenDiagnostics)
		document.addEventListener("fullscreenchange", updateScreenDiagnostics)
		return () => {
			window.removeEventListener("resize", updateScreenDiagnostics)
			viewport?.removeEventListener("resize", updateScreenDiagnostics)
			viewport?.removeEventListener("scroll", updateScreenDiagnostics)
			orientation?.removeEventListener("change", updateScreenDiagnostics)
			fullscreenMode.removeEventListener("change", updateScreenDiagnostics)
			document.removeEventListener("fullscreenchange", updateScreenDiagnostics)
			resolutionQuery?.removeEventListener("change", updateScreenDiagnostics)
		}
	}, [props.open])

	const coords = props.position?.coords
	const measurements =
		coords &&
		props.position &&
		([
			["Latitude", formatMeasurement(coords.latitude, "°", 6), MoveHorizontal],
			["Longitude", formatMeasurement(coords.longitude, "°", 6), MoveVertical],
			["Horizontal accuracy", formatMeasurement(coords.accuracy, " m"), LocateFixed],
			["Altitude", formatMeasurement(coords.altitude, " m"), Mountain],
			["Altitude accuracy", formatMeasurement(coords.altitudeAccuracy, " m"), Ruler],
			["Speed", formatMeasurement(coords.speed, " m/s", 2), Gauge],
			["Heading", formatMeasurement(coords.heading, "°"), Compass],
			[props.position.usesReceiptTime ? "Last fix received" : "Last fix", new Date(props.position.timestamp).toLocaleString(), Clock3]
		] as const)

	return (
		<Drawer.Backdrop
			isOpen={props.open}
			onOpenChange={(isOpen) => {
				if (!isOpen) props.onClose()
			}}
			isDismissable
			variant="blur"
		>
			<Drawer.Content placement={props.placement}>
				<Drawer.Dialog aria-labelledby="gps-title" className="w-full max-w-200">
					<Drawer.Header className="flex flex-row items-center justify-between gap-4">
						<Drawer.Heading id="gps-title" className="title">
							Diagnostics
						</Drawer.Heading>
						<Button isIconOnly variant="ghost" onPress={props.onClose} aria-label="Close diagnostics">
							<X size={20} />
						</Button>
					</Drawer.Header>
					<Drawer.Body className="overflow-y-shadow after:-bottom-0.75! space-y-4 pr-4">
						<SystemMessage>{props.message}</SystemMessage>
						<Card variant="transparent">
							<Card.Header>
								<Card.Title className="flex items-center gap-2 text-sm font-bold">
									<Satellite size={16} aria-hidden="true" />
									GPS diagnostics
								</Card.Title>
							</Card.Header>
							<Card.Content>
								{measurements ? (
									<dl className="divide-y divide-separator text-sm">
										{measurements.map(([label, value, Icon]) => (
											<div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
												<dt className="w-80 flex items-center gap-2">
													<Icon size={16} className="shrink-0" aria-hidden="true" />
													{label}
												</dt>
												<dd className="ml-auto text-right font-semibold tabular-nums">{value}</dd>
											</div>
										))}
									</dl>
								) : (
									<SystemMessage>No location fix received yet.</SystemMessage>
								)}
							</Card.Content>
						</Card>

						<Card variant="transparent">
							<Card.Header>
								<Card.Title className="flex items-center gap-2 text-sm font-bold">
									<Monitor size={16} aria-hidden="true" />
									Screen diagnostics
								</Card.Title>
							</Card.Header>
							<Card.Content>
								<dl className="divide-y divide-separator text-sm">
									{screenDiagnostics?.map(([label, value]) => (
										<div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
											<dt className="w-80">{label}</dt>
											<dd className="ml-auto min-w-0 text-right font-semibold tabular-nums">{value}</dd>
										</div>
									))}
								</dl>
							</Card.Content>
						</Card>

						<Card variant="transparent">
							<Card.Header>
								<Card.Title className="flex items-center gap-2 text-sm font-bold">
									<Globe size={16} aria-hidden="true" />
									Browser information
								</Card.Title>
							</Card.Header>
							<Card.Content>
								<dl className="divide-y divide-separator text-sm">
									{browserDiagnostics.map(([label, value]) => (
										<div key={label} className="flex items-baseline justify-between gap-x-4 gap-y-1 py-2">
											<dt className="w-80">{label}</dt>
											<dd className="ml-auto min-w-0 text-right font-semibold tabular-nums">{value}</dd>
										</div>
									))}
								</dl>
							</Card.Content>
						</Card>
					</Drawer.Body>
					<Drawer.Footer className="justify-end">
						<Button onPress={props.onClose} size="lg">
							Done
						</Button>
					</Drawer.Footer>
				</Drawer.Dialog>
			</Drawer.Content>
		</Drawer.Backdrop>
	)
}
