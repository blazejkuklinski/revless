import { Button, Card, Chip, Modal, Separator, Surface } from "@heroui/react"
import clsx from "clsx"
import { Engine, Flag, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { PerformanceMode } from "../performance"
import { getPerformanceChartData, getPerformanceSplits } from "../performanceReport"
import { toDisplaySpeed } from "../speed"
import type { PerformanceResult } from "../stores/performanceResultsStore"
import { SystemMessage } from "./SystemMessage"

type PerformanceReportModalProps = {
	result: PerformanceResult
	mode: PerformanceMode
	title: string
	onClose: () => void
}

export default function PerformanceReportModal({ result, mode, title, onClose }: PerformanceReportModalProps) {
	const imperial = result.unit === "imperial"
	const speedUnit = imperial ? "mph" : "km/h"
	const heightUnit = imperial ? "ft" : "m"
	const testLabel = mode === "distance" ? "¼ mile" : imperial ? "0–62 mph" : "0–100 km/h"
	const data = useMemo(() => getPerformanceChartData(result), [result])
	const splits = useMemo(() => getPerformanceSplits(result, mode), [result, mode])
	const [selection, setSelection] = useState({ startIndex: 0, endIndex: data.length - 1 })
	const [hiddenSeries, setHiddenSeries] = useState<Partial<Record<string, boolean>>>({})
	const { startIndex, endIndex } = selection
	const isZoomed = startIndex > 0 || endIndex < data.length - 1

	const series = [
		{ key: "speed", label: "Speed", unit: speedUnit, color: "var(--accent)" },
		{ key: "elevation", label: "Elevation change", unit: heightUnit, color: "var(--danger)" },
		{ key: "acceleration", label: "Acceleration", unit: "g", color: "var(--warning)" }
	] as const

	const availableSeries = series.filter(({ key }) => data.some((point) => point[key] !== null))
	const axisWidth = 36
	const formatSpeed = (speed: number | null) => (speed === null ? "—" : `${toDisplaySpeed(speed, result.unit).toFixed(1)} ${speedUnit}`)
	const summary = [
		{ label: "Distance", value: `${(imperial ? result.distanceMetres / 0.3048 : result.distanceMetres).toFixed(1)} ${heightUnit}` },
		{ label: "Finish speed", value: formatSpeed(result.finishSpeed) },
		{ label: "Avg. slope", value: result.slopePercent == null ? "—" : `${result.slopePercent.toFixed(2)}%` }
	]

	return (
		<Modal.Backdrop
			isOpen
			isDismissable
			variant="blur"
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
		>
			<Modal.Container placement="center">
				<Modal.Dialog className="w-full max-w-250">
					<Modal.Header className="flex flex-row items-center justify-between gap-4">
						<Modal.Heading className="title">{testLabel}</Modal.Heading>
						<Button isIconOnly variant="ghost" onPress={onClose} aria-label="Close performance report">
							<X size={20} />
						</Button>
					</Modal.Header>
					<Modal.Body className="pr-4 overflow-y-shadow after:-bottom-0.75!">
						<div className="grid lg:grid-cols-[auto_minmax(0,1fr)] gap-4">
							<Surface aria-label="Run summary" variant="secondary" className="rounded-2xl p-4 lg:p-6 space-y-6">
								<h3 className="text-muted uppercase">{title}</h3>
								<div className="flex lg:flex-col gap-x-12 gap-y-6 items-center lg:items-start">
									<div className="space-y-2">
										<div className="font-display text-3xl lg:text-7xl leading-none font-semibold tracking-tighter tabular-nums">
											{(result.elapsedMs / 1000).toFixed(2)} <span className="text-xl font-medium tracking-normal">sec</span>
										</div>
										{result.manual !== undefined && <div className="text-muted text-sm">{result.manual ? "Simulated run" : "GPS estimate"}</div>}
									</div>

									<Separator orientation="horizontal" className="hidden lg:block" />
									<Separator orientation="vertical" className="block lg:hidden" />

									<dl className="flex lg:flex-col gap-x-12 lg:gap-y-4">
										{summary.map(({ label, value }) => (
											<div key={label} className="space-y-1">
												<dt className="text-muted">{label}</dt>
												<dd className="font-semibold tabular-nums">{value}</dd>
											</div>
										))}
									</dl>
								</div>
							</Surface>
							<div className="min-w-0">
								{data.length ? (
									<Card variant="transparent">
										<Card.Header>
											<Card.Title className="flex items-center gap-2 justify-between">
												<div className="flex items-center gap-2">
													<Engine />
													Telemetry
												</div>
												{data.length > 1 && (
													<Button size="sm" variant="ghost" isDisabled={!isZoomed} onPress={() => setSelection({ startIndex: 0, endIndex: data.length - 1 })}>
														Reset zoom
													</Button>
												)}
											</Card.Title>
										</Card.Header>

										<Card.Content className="space-y-4">
											<ul className="flex flex-wrap gap-x-4 gap-y-2">
												{series.map(({ key, label, unit, color }) => (
													<li key={key}>
														<Button
															type="button"
															aria-pressed={!hiddenSeries[key] && availableSeries.some((item) => item.key === key)}
															isDisabled={!availableSeries.some((item) => item.key === key)}
															onPress={() => setHiddenSeries((current) => ({ ...current, [key]: !current[key] }))}
															variant="ghost"
															className={clsx(hiddenSeries[key] && "opacity-50")}
														>
															<span aria-hidden="true" className="h-1 w-3 rounded-full" style={{ backgroundColor: hiddenSeries[key] ? "var(--muted)" : color }} />
															{label} ({unit})
														</Button>
													</li>
												))}
											</ul>

											<div className="min-w-0 h-65 overflow-hidden">
												<ResponsiveContainer width="100%" height="100%">
													<LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
														<CartesianGrid yAxisId="speed" horizontal vertical syncWithTicks stroke="var(--muted)" strokeOpacity={0.25} strokeDasharray="4 4" />
														<XAxis
															type="number"
															dataKey="seconds"
															padding={{ left: 10, right: 10 }}
															domain={startIndex === endIndex ? ["auto", "auto"] : ["dataMin", "dataMax"]}
															tickFormatter={(value: number) => `${Number(value.toFixed(2))}s`}
															tick={{ fill: "var(--muted)", fontSize: 10 }}
															tickLine={false}
															axisLine={false}
															minTickGap={20}
														/>
														{availableSeries.map(({ key, color }) => (
															<YAxis
																key={key}
																yAxisId={key}
																orientation={key === "speed" ? "left" : "right"}
																includeHidden
																width={axisWidth}
																padding={{ top: 10, bottom: 10 }}
																tickCount={5}
																tickFormatter={(value: number) => Number(value.toFixed(1)).toString()}
																tick={{ fill: color, fontSize: 10 }}
																tickLine={false}
																axisLine={false}
																domain={key === "speed" && !isZoomed ? [0, "auto"] : ["auto", "auto"]}
															/>
														))}
														<Tooltip
															labelFormatter={(value) => `${Number(value).toFixed(2)} s`}
															formatter={(value) => Number(value).toFixed(2)}
															contentStyle={{ backgroundColor: "var(--surface-secondary)", borderColor: "var(--separator)", color: "var(--surface-secondary-foreground)", borderRadius: 6, fontSize: 12 }}
														/>
														{availableSeries.map(({ key, label, unit, color }) => (
															<Line
																key={key}
																yAxisId={key}
																dataKey={key}
																hide={hiddenSeries[key]}
																name={label}
																unit={` ${unit}`}
																type="monotoneX"
																stroke={color}
																strokeWidth={3}
																strokeLinecap="round"
																strokeLinejoin="round"
																dot={startIndex === endIndex || data.filter((point) => point[key] !== null).length === 1}
																activeDot={{ r: 4 }}
																connectNulls={false}
																isAnimationActive={false}
															/>
														))}
														{data.length > 1 && (
															<Brush
																className="touch-none"
																dataKey="seconds"
																height={28}
																travellerWidth={12}
																startIndex={startIndex}
																endIndex={endIndex}
																onChange={setSelection}
																tickFormatter={(value: number) => `${value.toFixed(2)} s`}
																fill="var(--surface-secondary)"
																stroke="var(--muted)"
															/>
														)}
													</LineChart>
												</ResponsiveContainer>
											</div>

											{data.length > 1 && <SystemMessage>Drag the handles to zoom. Drag the selected range to pan.</SystemMessage>}
											{availableSeries.length < series.length && (
												<SystemMessage>{result.manual ? "Elevation and acceleration are unavailable for simulated runs." : "Some telemetry was unavailable during this run."}</SystemMessage>
											)}
										</Card.Content>
									</Card>
								) : (
									<SystemMessage>Telemetry and split times are unavailable for this saved result.</SystemMessage>
								)}
								{splits.length > 0 && (
									<Card variant="transparent">
										<Card.Header>
											<Card.Title className="flex items-center gap-2 justify-between">
												<div className="flex items-center gap-2">
													<Flag />
													Split times
												</div>
											</Card.Title>
										</Card.Header>

										<ul className="grid tabular-nums lg:grid-flow-col lg:grid-cols-2 lg:gap-x-6 divide-y" style={{ gridTemplateRows: `repeat(${Math.ceil(splits.length / 2)}, auto)` }}>
											{splits.map((split, i) => (
												<li key={split.label} className="flex items-baseline gap-3 py-2 ">
													<Chip>{i + 1}</Chip>
													<span className="mr-auto font-medium">{split.label}</span>
													<span className="whitespace-nowrap">{(split.elapsedMs / 1000).toFixed(2)} s</span>
													{mode === "distance" && (
														<span className="min-w-22 whitespace-nowrap text-right text-muted">
															<span className="sr-only">Speed at split </span>
															{formatSpeed(split.speed)}
														</span>
													)}
												</li>
											))}
										</ul>
									</Card>
								)}
							</div>
						</div>
					</Modal.Body>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
