import { Button, Card } from "@heroui/react"
import { Crown, RotateCcw } from "lucide-react"
import { ReactNode } from "react"
import { distanceUnitLabel, speedUnitLabel, toDisplayDistance, toDisplaySpeed } from "../speed"
import { PerformanceResult } from "../stores/performanceResultsStore"
import { SystemMessage } from "./SystemMessage"

type ResultCardProps = {
	icon?: ReactNode
	title: ReactNode
	result?: PerformanceResult | null
	onReset?: () => void
	resetLabel?: string
	record?: boolean | null
	className?: string
}

export default function ResultCard(props: ResultCardProps) {
	const slopePercent = props.result?.slopePercent

	return (
		<Card variant="secondary" className={props.className}>
			<Card.Header>
				<Card.Title className="flex flex-wrap items-center justify-between gap-4 h-8">
					<div className="flex items-center gap-2">
						{props.icon}
						{props.title}
					</div>
					{props.onReset && (
						<Button size="sm" variant="ghost" isIconOnly isDisabled={!props.result} aria-label={props.resetLabel ?? "Reset result"} onPress={props.onReset}>
							<RotateCcw />
						</Button>
					)}
				</Card.Title>
			</Card.Header>
			<Card.Content className="flex flex-col justify-center">
				{props.result ? (
					<div className="space-y-2">
						<div className="flex gap-1 items-end">
							<span className="font-display text-3xl font-semibold">{(props.result.elapsedMs / 1000).toFixed(2)}</span>
							<span className="text-sm text-muted">sec</span>
							{props.record && <Crown size={15} className="text-success self-center flex-1 justify-center animate-bounce" />}
						</div>
						<dl className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
							<div>
								<dt className="text-muted">Finish speed</dt>
								<dd>{props.result.finishSpeed === null ? "—" : `${Math.round(toDisplaySpeed(props.result.finishSpeed, props.result.unit))} ${speedUnitLabel(props.result.unit)}`}</dd>
							</div>
							<div>
								<dt className="text-muted">Distance</dt>
								<dd>
									{toDisplayDistance(props.result.distanceMetres / 1000, props.result.unit).toFixed(3)} {distanceUnitLabel(props.result.unit)}
								</dd>
							</div>
							<div>
								<dt className="text-muted">Avg. slope</dt>
								<dd>{slopePercent == null ? "—" : `${slopePercent > 0 ? "+" : ""}${slopePercent.toFixed(1)}%`}</dd>
							</div>
						</dl>
					</div>
				) : (
					<SystemMessage color="warning" variant="soft">
						No result yet
					</SystemMessage>
				)}
			</Card.Content>
		</Card>
	)
}
