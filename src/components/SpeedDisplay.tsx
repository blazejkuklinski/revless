import { Card, Separator } from "@heroui/react"
import { useCallback, useRef } from "react"
import type { GpsFix, GpsStatus } from "../hooks/useDrive"
import { speedUnitLabel, toDisplaySpeed, type SpeedUnit } from "../speed"
import type { Trip } from "../trip"
import CompassChip from "./CompassChip"
import CountUp from "./CountUp"
import { EngineTelemetry } from "./EngineTelemetry"
import GpsStatusChip from "./GpsStatusChip"
import { MiniMap } from "./MiniMap"
import MinimapZoomChip from "./MinimapZoomChip"
import { TripSummary } from "./TripSummary"
import WeatherChip from "./WeatherChip"

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
	onResetTrip: () => void
}

export function SpeedDisplay(props: SpeedDisplay) {
	const mapArea = useRef<HTMLDivElement>(null)
	const updateNorth = useCallback((mapBearing: number) => {
		mapArea.current?.style.setProperty("--map-north-rotation", `${-mapBearing}deg`)
	}, [])

	return (
		<Card className="min-h-0 min-w-0 flex-1 flex-col p-4 gap-4 lg:gap-6 grid grid-cols-2 lg:grid-cols-1 portrait:grid-cols-1 grid-rows-[minmax(0,1fr)] ">
			<div ref={mapArea} className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
				<MiniMap position={props.position} status={props.gpsStatus} dark={props.dark} showStreetNames={props.showStreetNames} showPointsOfInterest={props.showPointsOfInterest} onBearingChange={updateNorth} />

				<div className="relative flex gap-8 justify-between items-center">
					<div className="flex flex-wrap items-center gap-4">
						<GpsStatusChip gpsStatus={props.gpsStatus} />
						<MinimapZoomChip position={props.position} />
					</div>
					<div className="flex flex-wrap items-center gap-4">
						<WeatherChip position={props.position} unit={props.unit} />
						<CompassChip gpsStatus={props.gpsStatus} position={props.position} />
					</div>
				</div>

				<div className="pointer-events-none absolute inset-x-0 top-1/3 -translate-y-1/2 flex-col items-center flex landscape:h-sm:hidden landscape:h-md:flex">
					<div className="font-display text-3xl h-sm:text-7xl leading-none font-semibold tracking-tight">
						<CountUp end={Math.round(toDisplaySpeed(props.speed, props.unit))} duration={0.4} preserveValue />
					</div>
					<div className="landscape:lg:text-xl text-muted">{speedUnitLabel(props.unit)}</div>
				</div>
			</div>

			<div className="flex min-w-0 shrink-0 flex-col gap-4 lg:lg:gap-6 justify-end overflow-auto">
				<div className="flex-1 flex-col items-center justify-center hidden landscape:h-sm:flex landscape:h-md:hidden">
					<div className="font-display text-7xl leading-none font-semibold tracking-tight">
						<CountUp end={Math.round(toDisplaySpeed(props.speed, props.unit))} duration={0.4} preserveValue />
					</div>
					<div className="text-xl text-muted">{speedUnitLabel(props.unit)}</div>
				</div>
				<Separator className="shrink-0 hidden h-sm:block" />
				<EngineTelemetry gear={props.gear} rpm={props.rpm} idling={props.idling} maxRpm={props.maxRpm} redZoneRpm={props.redZoneRpm} />
				<TripSummary trip={props.trip} unit={props.unit} onReset={props.onResetTrip} />
			</div>
		</Card>
	)
}
