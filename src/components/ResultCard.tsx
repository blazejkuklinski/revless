import { Button, Card } from "@heroui/react"
import clsx from "clsx"
import { ChevronRight, Crown, RotateCcw } from "lucide-react"
import { ReactNode } from "react"
import { PerformanceResult } from "../stores/performanceResultsStore"
import { SystemMessage } from "./SystemMessage"

type ResultCardProps = {
	icon?: ReactNode
	best?: boolean
	result?: PerformanceResult | null
	onReset?: () => void
	record?: boolean
	onOpen: () => void
}

export default function ResultCard(props: ResultCardProps) {
	const title = props.best ? "Best result" : "Last result"
	const resetLabel = props.best ? "Reset best result" : "Reset last result"
	return (
		<Card variant="secondary" className={clsx("border-l-5 ", props.best ? "border-amber-500" : "border-accent")}>
			<Card.Header>
				<Card.Title className="flex flex-wrap items-center justify-between gap-4 h-8">
					<div className="flex items-center gap-2">
						{props.icon}
						{title}
					</div>
					{props.onReset && (
						<Button className="relative z-10" size="sm" variant="ghost" isIconOnly isDisabled={!props.result} aria-label={resetLabel} onPress={props.onReset}>
							<RotateCcw />
						</Button>
					)}
				</Card.Title>
			</Card.Header>
			<Card.Content className="flex flex-col justify-center">
				{props.result ? (
					<button type="button" className="cursor-pointer" onClick={props.onOpen}>
						<div className="flex gap-2 justify-between items-center">
							<div className="flex items-end gap-4">
								<div>
									<span className="font-display text-3xl font-semibold tabular-nums">{(props.result.elapsedMs / 1000).toFixed(2)}</span>
									<span className="text-sm text-muted"> sec</span>
								</div>
								{props.record && (
									<span className="self-center text-success" title="Personal record">
										<Crown size={20} aria-hidden="true" className="motion-safe:animate-ping" />
									</span>
								)}
							</div>

							<ChevronRight aria-hidden="true" size={18} />
						</div>
					</button>
				) : (
					<SystemMessage color="warning" variant="soft">
						No result yet
					</SystemMessage>
				)}
			</Card.Content>
		</Card>
	)
}
