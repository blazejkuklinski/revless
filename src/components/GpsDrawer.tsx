import { Button, Drawer } from "@heroui/react"
import { Clock3, Compass, Gauge, LocateFixed, Mountain, MoveHorizontal, MoveVertical, Ruler, X } from "lucide-react"
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

export function GpsDrawer(props: GpsDrawer) {
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
				<Drawer.Dialog aria-labelledby="gps-title" className="max-w-screen w-full md:w-2/3 lg:w-1/2">
					<Drawer.Header className="flex flex-row items-center justify-between gap-4">
						<Drawer.Heading id="gps-title" className="title">
							GPS
						</Drawer.Heading>
						<Button isIconOnly variant="ghost" onPress={props.onClose} aria-label="Close GPS">
							<X size={20} />
						</Button>
					</Drawer.Header>
					<Drawer.Body className="text-foreground p-4 space-y-6">
						<SystemMessage>{props.message}</SystemMessage>
						{measurements ? (
							<dl className="divide-y divide-separator text-sm">
								{measurements.map(([label, value, Icon]) => (
									<div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
										<dt className="flex items-center gap-2 text-muted">
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
					</Drawer.Body>
				</Drawer.Dialog>
			</Drawer.Content>
		</Drawer.Backdrop>
	)
}
