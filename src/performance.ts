import { maxGpsSpeedKmh, maxSampleGapMs, performanceTargetKmh, quarterMileMetres, startSpeedKmh } from "./parameters"
import type { SpeedUnit } from "./speed"

export type PerformanceMode = "speed" | "distance"

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
		reason: null
	}
}

export function invalidatePerformanceRun(run: PerformanceRun, reason: string): PerformanceRun {
	return { ...run, phase: "invalid", reason }
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
		const remaining = quarterMileMetres - run.distanceMetres
		const acceleration = (currentMps - previousMps) / seconds
		const finishMps = Math.sqrt(Math.max(0, previousMps ** 2 + 2 * acceleration * remaining))
		const crossingSeconds = Math.min(seconds, (2 * remaining) / (previousMps + finishMps))

		elapsedMs = previousTime - startedAt + crossingSeconds * 1000
		distanceMetres = quarterMileMetres
		finishSpeed = finishMps * 3.6
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
		finishSpeed
	}

	if (finishSpeed !== null) {
		let finishAltitudeMetres = sampleAltitudeMetres
		// Use the elevation at the target crossing, which can be before the final GPS fix.
		if (finishAltitudeMetres !== null && distanceMetres < sampledDistanceMetres) {
			const previousAltitudeMetres = run.lastAltitudeMetres
			const fraction = (distanceMetres - run.distanceMetres) / sampleDistanceMetres
			finishAltitudeMetres = previousAltitudeMetres === null ? null : previousAltitudeMetres + (finishAltitudeMetres - previousAltitudeMetres) * fraction
		}
		const slopePercent = startAltitudeMetres !== null && finishAltitudeMetres !== null && distanceMetres > 0 ? ((finishAltitudeMetres - startAltitudeMetres) / distanceMetres) * 100 : null

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
