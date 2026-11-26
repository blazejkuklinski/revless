import { maxGpsSpeedKmh, maxSampleGapMs, performanceTargetKmh, quarterMileMetres, startSpeedKmh } from "./parameters"
import type { SpeedUnit } from "./speed"

export type PerformanceMode = "speed" | "distance"

export type PerformanceSample = {
	elapsedMs: number
	speed: number
	distanceMetres: number
	altitudeMetres: number | null
}

export type PerformanceRun = {
	mode: PerformanceMode
	unit: SpeedUnit
	phase: "armed" | "running" | "complete" | "invalid"
	manual: boolean
	startedAt: number | null
	startAltitudeMetres: number | null
	lastTime: number
	lastSpeed: number
	lastAltitudeMetres: number | null
	distanceMetres: number
	elapsedMs: number
	finishSpeed: number | null
	slopePercent: number | null
	reason: string | null
	samples: PerformanceSample[]
}

export function createPerformanceRun(mode: PerformanceMode, unit: SpeedUnit, manual: boolean, now: number, altitudeMetres: number | null = null): PerformanceRun {
	return {
		mode,
		unit,
		manual,
		phase: "armed",
		startedAt: null,
		startAltitudeMetres: null,
		lastTime: now,
		lastSpeed: 0,
		lastAltitudeMetres: !manual && Number.isFinite(altitudeMetres) ? altitudeMetres : null,
		distanceMetres: 0,
		elapsedMs: 0,
		finishSpeed: null,
		slopePercent: null,
		reason: null,
		samples: []
	}
}

export function invalidatePerformanceRun(run: PerformanceRun, reason: string): PerformanceRun {
	return { ...run, phase: "invalid", reason }
}

export function estimateDistanceCrossing(distanceMetres: number, durationSeconds: number, startKmh: number, endKmh: number) {
	const startMps = startKmh / 3.6
	const acceleration = (endKmh / 3.6 - startMps) / durationSeconds
	const crossingMps = Math.sqrt(Math.max(0, startMps ** 2 + 2 * acceleration * distanceMetres))
	return {
		seconds: Math.min(durationSeconds, (2 * distanceMetres) / (startMps + crossingMps)),
		speed: crossingMps * 3.6
	}
}

// Speed samples are km/h; time is in milliseconds. No rollout is subtracted.
export function recordPerformanceSample(run: PerformanceRun, time: number, speed: number, altitudeMetres: number | null = null): PerformanceRun {
	if ((run.phase !== "armed" && run.phase !== "running") || !Number.isFinite(time) || time <= run.lastTime) return run
	if (!Number.isFinite(speed) || speed < 0 || speed > maxGpsSpeedKmh) return invalidatePerformanceRun(run, "A valid speed reading was unavailable.")

	const sampleAltitudeMetres = !run.manual && Number.isFinite(altitudeMetres) ? altitudeMetres : null

	if (run.phase === "armed" && speed <= startSpeedKmh) return { ...run, lastTime: time, lastSpeed: 0, lastAltitudeMetres: sampleAltitudeMetres ?? run.lastAltitudeMetres }
	if (!run.manual && time - run.lastTime > maxSampleGapMs) return invalidatePerformanceRun(run, "GPS updates were interrupted.")

	const previousTime = run.phase === "armed" && run.manual ? time : run.lastTime
	const startedAt = run.startedAt ?? previousTime
	const startAltitudeMetres = run.phase === "armed" ? run.lastAltitudeMetres : run.startAltitudeMetres
	const seconds = (time - previousTime) / 1000
	const previousMps = run.lastSpeed / 3.6
	const currentMps = run.manual ? previousMps : speed / 3.6
	const averageMps = (previousMps + currentMps) / 2
	const sampleDistanceMetres = averageMps * seconds
	const sampledDistanceMetres = run.distanceMetres + sampleDistanceMetres

	let distanceMetres = sampledDistanceMetres
	let elapsedMs = time - startedAt
	let finishSpeed: number | null = null

	// Estimate the target crossing between samples. Manual speed changes are instantaneous.
	if (run.mode === "speed" && speed >= performanceTargetKmh) {
		finishSpeed = run.manual ? speed : performanceTargetKmh

		if (!run.manual) {
			const crossingSeconds = (seconds * (performanceTargetKmh - run.lastSpeed)) / (speed - run.lastSpeed)
			elapsedMs = previousTime - startedAt + crossingSeconds * 1000
			distanceMetres = run.distanceMetres + ((previousMps + finishSpeed / 3.6) / 2) * crossingSeconds
		}
	} else if (run.mode === "distance" && distanceMetres >= quarterMileMetres) {
		const crossing = estimateDistanceCrossing(quarterMileMetres - run.distanceMetres, seconds, run.lastSpeed, run.manual ? run.lastSpeed : speed)

		elapsedMs = previousTime - startedAt + crossing.seconds * 1000
		distanceMetres = quarterMileMetres
		finishSpeed = crossing.speed
	}

	const previousSamples = run.phase === "armed" && !run.manual
		? [{ elapsedMs: 0, speed: 0, distanceMetres: 0, altitudeMetres: startAltitudeMetres }]
		: run.samples
	let altitudeAtCrossing = sampleAltitudeMetres
	// Use the elevation at the target crossing, which can be before the final GPS fix.
	if (sampleAltitudeMetres !== null && distanceMetres < sampledDistanceMetres) {
		const previousAltitude = run.lastAltitudeMetres
		const fraction = (distanceMetres - run.distanceMetres) / sampleDistanceMetres
		altitudeAtCrossing = previousAltitude === null ? null : previousAltitude + (sampleAltitudeMetres - previousAltitude) * fraction
	}

	const next = {
		...run,
		startedAt,
		startAltitudeMetres,
		lastTime: time,
		lastSpeed: speed,
		lastAltitudeMetres: sampleAltitudeMetres,
		distanceMetres,
		elapsedMs,
		finishSpeed,
		samples: [...previousSamples, {
			elapsedMs,
			speed: finishSpeed ?? speed,
			distanceMetres,
			altitudeMetres: altitudeAtCrossing
		}]
	}

	if (finishSpeed !== null) {
		const slopePercent = startAltitudeMetres !== null && altitudeAtCrossing !== null && distanceMetres > 0 ? ((altitudeAtCrossing - startAltitudeMetres) / distanceMetres) * 100 : null

		return { ...next, phase: "complete", slopePercent }
	}

	if (speed === 0) {
		return invalidatePerformanceRun(next, "The vehicle stopped before reaching the target.")
	}

	return {
		...next,
		phase: "running"
	}
}
