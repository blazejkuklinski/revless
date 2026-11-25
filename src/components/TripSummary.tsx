import { Card } from "@heroui/react"
import { Clock3, Gauge, Road, TrendingUp } from "lucide-react"
import { distanceUnitLabel, speedUnitLabel, toDisplayDistance, toDisplaySpeed, type SpeedUnit } from "../speed"
import type { Trip } from "../trip"

function formatDuration(milliseconds: number) {
	const seconds = Math.floor(milliseconds / 1000)
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor(seconds / 60) % 60
	const remainder = seconds % 60
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

type TripSummary = { trip: Trip; unit: SpeedUnit }

export function TripSummary(props: TripSummary) {
	const averageSpeed = props.trip.elapsedMs > 0 ? props.trip.distanceKm / (props.trip.elapsedMs / 3_600_000) : 0
	const metrics = [
		{ label: "Distance", value: props.trip.hasDistance ? toDisplayDistance(props.trip.distanceKm, props.unit).toFixed(2) : "—", unit: distanceUnitLabel(props.unit), icon: Road },
		{ label: "Duration", value: formatDuration(props.trip.elapsedMs), unit: "", icon: Clock3 },
		{ label: "Average speed", value: props.trip.hasDistance ? Math.round(toDisplaySpeed(averageSpeed, props.unit)).toLocaleString() : "—", unit: speedUnitLabel(props.unit), icon: Gauge },
		{ label: "Top speed", value: props.trip.hasSpeed ? Math.round(toDisplaySpeed(props.trip.topSpeed, props.unit)).toLocaleString() : "—", unit: speedUnitLabel(props.unit), icon: TrendingUp }
	]
	return (
		<Card variant="secondary" className="p-2 landscape:lg:p-4 w-full min-w-0 shrink-0 self-start">
			<div className="grid gap-4 grid-cols-2 landscape:lg:grid-cols-4  max-h-11 h-xs:max-h-none landscape:lg:max-h-none portrait:max-h-none overflow-y-indicator">
				{metrics.map(({ label, value, unit: metricUnit, icon: Icon }) => (
					<div key={label} className="flex min-w-0 items-start gap-4 landscape:lg:border-r landscape:lg:pr-4 landscape:lg:mr-4 last:border-r-0 last:mr-0 last:pr-0">
						<Icon size={20} className="shrink-0 text-muted" aria-hidden="true" />
						<div className="min-w-0 space-y-1">
							<div className="font-display leading-none text-nowrap font-semibold tabular-nums text-xl h-lg:text-3xl">
								{value} {metricUnit && <span className="font-sans text-xs text-muted">{metricUnit}</span>}
							</div>
							<div className="text-xs h-lg:lg:text-sm text-muted text-nowrap">{label}</div>
						</div>
					</div>
				))}
			</div>
		</Card>
	)
}
