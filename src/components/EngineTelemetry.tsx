import { Separator } from "@heroui/react"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { idleRpmFluctuation } from "../parameters"

type EngineTelemetry = { gear: number | null; rpm: number; idling: boolean; maxRpm: number; redZoneRpm: number }

export function EngineTelemetry(props: EngineTelemetry) {
	const [idleOffset, setIdleOffset] = useState(0)

	useEffect(() => {
		if (!props.idling || idleRpmFluctuation === 0) return

		const timer = window.setInterval(() => {
			setIdleOffset((Math.random() * 2 - 1) * idleRpmFluctuation)
		}, 250)
		return () => window.clearInterval(timer)
	}, [props.idling])

	const rpm = props.idling ? props.rpm + idleOffset : props.rpm
	const fraction = Math.min(rpm / props.maxRpm, 1) * 100
	const redZoneStart = (props.redZoneRpm / props.maxRpm) * 100
	const inRedZone = rpm >= props.redZoneRpm

	return (
		<div className="grid min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)] gap-2">
			<div className="flex flex-col justify-between gap-2 px-4 h-lg:lg:px-6">
				<span className="text-xs font-bold tracking-widest text-muted">GEAR</span>
				<span className="font-display leading-none font-semibold tracking-tight text-3xl h-lg:lg:text-6xl">{props.gear ?? "-"}</span>
				<small className="text-xs font-bold tracking-widest text-muted">SIMULATED</small>
			</div>

			<Separator orientation="vertical" />

			<div className="flex min-w-0 flex-col justify-between gap-2 px-4 h-lg:lg:px-6">
				<span className="text-xs font-bold tracking-widest text-muted">ENGINE SPEED</span>

				<span>
					<span className={clsx("font-display text-xl h-lg:lg:text-4xl leading-none font-semibold tracking-tight", inRedZone && "text-danger")}>{Math.round(rpm).toLocaleString("en-US")}</span>
					&nbsp;
					<span className="font-sans text-xs font-bold tracking-widest text-muted">RPM</span>
				</span>

				<div className="space-y-2">
					<div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-secondary" aria-hidden="true">
						<div className="absolute inset-y-0 right-0 bg-danger/25" style={{ width: `${100 - redZoneStart}%` }} />
						<div className="absolute inset-y-0 left-0 bg-accent/70" style={{ width: `${Math.min(fraction, redZoneStart)}%` }} />
						<div
							className="absolute inset-y-0 bg-danger"
							style={{
								left: `${redZoneStart}%`,
								width: `${Math.max(0, fraction - redZoneStart)}%`
							}}
						/>
					</div>

					<div className="text-xs font-bold tracking-widest flex w-full justify-between text-muted">
						<span>0</span>
						<span>{(props.maxRpm / 1000).toLocaleString()}K RPM</span>
					</div>
				</div>
			</div>
		</div>
	)
}
