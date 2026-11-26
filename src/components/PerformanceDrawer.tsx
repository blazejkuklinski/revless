import { Button, ButtonGroup, Card, Checkbox, Drawer, Label } from "@heroui/react"
import { Flag, Info, Trophy, X } from "lucide-react"
import { useState } from "react"
import type { PerformanceMode, PerformanceRun } from "../performance"
import { usePerformanceResultsStore } from "../stores/performanceResultsStore"
import { useSettingsStore } from "../stores/settingsStore"
import ResultCard from "./ResultCard"
import { SystemMessage } from "./SystemMessage"

type PerformanceDrawer = {
	open: boolean
	placement: "left" | "right"
	onClose: () => void
	manual: boolean
	armBlockedMessage: string | null
	run: PerformanceRun | null
	onStart: (mode: PerformanceMode) => boolean
	onCancel: () => void
}

export function PerformanceDrawer(props: PerformanceDrawer) {
	const { run } = props
	const [mode, setMode] = useState<PerformanceMode>("speed")
	const [safetyConfirmed, setSafetyConfirmed] = useState(false)
	const results = usePerformanceResultsStore((state) => state.results[mode])
	const resetResult = usePerformanceResultsStore((state) => state.resetResult)
	const inProgress = run?.phase === "armed" || run?.phase === "running"
	const canStart = safetyConfirmed && props.armBlockedMessage === null
	const isRecord = !!results?.last && !!results.best && results.last.elapsedMs === results.best.elapsedMs
	const { speedUnit } = useSettingsStore((t) => t.settings)

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
				<Drawer.Dialog aria-labelledby="performance-title" className="w-full max-w-200">
					<Drawer.Header className="flex flex-row items-center justify-between gap-4 pb-6">
						<Drawer.Heading id="performance-title" className="title">
							Performance
						</Drawer.Heading>
						<Button isIconOnly variant="ghost" onPress={props.onClose} aria-label="Close performance report">
							<X size={20} />
						</Button>
					</Drawer.Header>
					<Drawer.Body className="overflow-y-shadow after:-bottom-0.75! space-y-4 pr-4">
						<SystemMessage>
							{props.manual ? "Local testing uses simulated speed. Close the drawer to adjust the manual controls." : "Results are estimates from browser GPS. Accuracy and update frequency vary by device."}&nbsp; Timing starts from a
							standstill without rollout.
						</SystemMessage>

						{props.armBlockedMessage && <SystemMessage icon={Info}>{props.armBlockedMessage}</SystemMessage>}

						{run?.phase === "invalid" && run.mode === mode && (
							<SystemMessage icon={Info} color="warning">
								Run incomplete. {run.reason}
							</SystemMessage>
						)}

						{inProgress ? (
							<Card className="gap-4" variant="secondary">
								<div className="text-xs font-bold uppercase tracking-wider text-muted">
									{run.mode === "distance" ? "¼ mile" : "0–100 km/h"} · {run.manual ? "simulated" : "GPS estimate"}
								</div>
								<p className="text-lg font-semibold">{run.phase === "armed" ? "Ready. The timer starts when you move." : "Run in progress"}</p>
							</Card>
						) : (
							<>
								<ButtonGroup fullWidth aria-label="Choose a performance test" size="lg">
									<Button variant={mode === "speed" ? "secondary" : "tertiary"} aria-pressed={mode === "speed"} onPress={() => setMode("speed")}>
										0-{speedUnit == "metric" ? "100 km/h" : "62mph"}
									</Button>
									<Button variant={mode === "distance" ? "secondary" : "tertiary"} aria-pressed={mode === "distance"} onPress={() => setMode("distance")}>
										¼ mile
									</Button>
								</ButtonGroup>

								<div className="grid gap-3 md:grid-cols-2">
									<ResultCard icon={<Flag size={15} />} title="Last result" result={results?.last} resetLabel="Reset last result" onReset={() => resetResult(mode, "last")} record={isRecord} className="ring-accent hover:ring" />
									<ResultCard icon={<Trophy size={15} />} title="Best result" result={results?.best} resetLabel="Reset best result" onReset={() => resetResult(mode, "best")} className="ring-amber-500 hover:ring" />
								</div>
							</>
						)}
					</Drawer.Body>
					<Drawer.Footer className="gap-4 flex-nowrap justify-end">
						{inProgress ? (
							<Button variant="secondary" onPress={props.onCancel} size="lg">
								Cancel run
							</Button>
						) : (
							<>
								<Checkbox variant="secondary" isSelected={safetyConfirmed} onChange={setSafetyConfirmed}>
									<Checkbox.Content>
										<Checkbox.Control>
											<Checkbox.Indicator />
										</Checkbox.Control>
										<Label>I will only run performance tests on a closed course with enough room to accelerate and stop safely.</Label>
									</Checkbox.Content>
								</Checkbox>
								<Button
									size="lg"
									variant="primary"
									isDisabled={!canStart}
									onPress={() => {
										if (canStart) props.onStart(mode)
									}}
								>
									Start
								</Button>
							</>
						)}
					</Drawer.Footer>
				</Drawer.Dialog>
			</Drawer.Content>
		</Drawer.Backdrop>
	)
}
