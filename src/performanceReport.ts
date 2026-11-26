import { performanceTargetKmh, quarterMileMetres } from "./parameters"
import { estimateDistanceCrossing, type PerformanceMode } from "./performance"
import { toDisplaySpeed, toKmh } from "./speed"
import type { PerformanceResult } from "./stores/performanceResultsStore"

export function getPerformanceSplits(result: PerformanceResult, mode: PerformanceMode) {
	const { samples, unit, manual } = result
	if (!samples?.length) return []
	const imperial = unit === "imperial"
	const speedMarks = imperial ? [10, 20, 30, 40, 50, 60] : [20, 40, 60, 80]
	const marks = mode === "speed"
		? [
			...speedMarks.map((speed) => ({ label: `0–${speed} ${imperial ? "mph" : "km/h"}`, target: toKmh(speed, unit) })),
			{ label: imperial ? "0–62 mph" : "0–100 km/h", target: performanceTargetKmh }
		]
		: [
			{ label: "60 ft", target: 60 * 0.3048 },
			{ label: "330 ft", target: 330 * 0.3048 },
			{ label: "⅛ mile", target: quarterMileMetres / 2 },
			{ label: "1,000 ft", target: 1000 * 0.3048 },
			{ label: "¼ mile", target: quarterMileMetres }
		]

	return marks.flatMap(({ label, target }, markIndex) => {
		if (markIndex === marks.length - 1) return [{ label, elapsedMs: result.elapsedMs, speed: result.finishSpeed }]
		const index = samples.findIndex((sample) => (mode === "speed" ? sample.speed : sample.distanceMetres) >= target)
		if (index < 0) return []
		const sample = samples[index]
		const previous = samples[index - 1]
		if (!previous || (manual && mode === "speed")) return [{ label, elapsedMs: sample.elapsedMs, speed: sample.speed }]
		const durationMs = sample.elapsedMs - previous.elapsedMs
		if (mode === "speed") {
			const fraction = (target - previous.speed) / (sample.speed - previous.speed)
			return [{ label, elapsedMs: previous.elapsedMs + durationMs * fraction, speed: target }]
		}
		const crossing = estimateDistanceCrossing(target - previous.distanceMetres, durationMs / 1000, previous.speed, manual ? previous.speed : sample.speed)
		return [{ label, elapsedMs: previous.elapsedMs + crossing.seconds * 1000, speed: crossing.speed }]
	})
}

export function getPerformanceChartData(result: PerformanceResult) {
	const samples = result.samples ?? []
	const baseline = samples.find((sample) => sample.altitudeMetres !== null)?.altitudeMetres ?? null
	return samples.map((sample, index) => {
		const previous = samples[index - 1]
		const acceleration = previous && !result.manual
			? ((sample.speed - previous.speed) / 3.6) / ((sample.elapsedMs - previous.elapsedMs) / 1000) / 9.80665
			: null
		const elevation = sample.altitudeMetres === null || baseline === null
			? null
			: (sample.altitudeMetres - baseline) / (result.unit === "imperial" ? 0.3048 : 1)
		return {
			seconds: sample.elapsedMs / 1000,
			speed: toDisplaySpeed(sample.speed, result.unit),
			elevation,
			acceleration
		}
	})
}

