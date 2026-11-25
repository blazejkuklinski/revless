import { useEffect, useState } from "react"
import { maxGpsAccuracy, maxSampleGapMs, maxStandingFixAgeMs, startSpeedKmh } from "../parameters"
import { createPerformanceRun, invalidatePerformanceRun, recordPerformanceSample, type PerformanceMode, type PerformanceRun } from "../performance"
import type { SpeedUnit } from "../speed"
import { usePerformanceResultsStore } from "../stores/performanceResultsStore"
import type { GpsFix } from "./useDrive"
function hasAccurateFix({ accuracy }: GeolocationCoordinates) {
	return Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= maxGpsAccuracy
}

export function usePerformanceRun(active: boolean, manual: boolean, speed: number, position: GpsFix | null, onFinish: () => void) {
	const [run, setRun] = useState<PerformanceRun | null>(null)
	const measuring = run?.phase === "armed" || run?.phase === "running"
	const armBlockReason = (now: number) => {
		if (!active) return "Start a drive before starting a test."
		if (speed > startSpeedKmh) return "Stop the vehicle before starting a test."
		if (!manual && (!position || now - position.timestamp > maxStandingFixAgeMs)) return "Waiting for a fresh GPS fix."
		if (!manual && position && !hasAccurateFix(position.coords)) return "Waiting for a more accurate GPS fix."
		return null
	}

	const arm = (mode: PerformanceMode, unit: SpeedUnit) => {
		const now = Date.now()
		if (measuring || armBlockReason(now)) return false
		setRun(createPerformanceRun(mode, unit, manual, now, position?.coords.altitude))
		return true
	}

	useEffect(() => {
		if (!measuring) return
		const updateRun = () => {
			const now = Date.now()
			setRun((current) => {
				if (!current || (current.phase !== "armed" && current.phase !== "running")) return current
				if (!active) return invalidatePerformanceRun(current, "The drive ended before the run finished.")
				if (manual) return recordPerformanceSample(current, now, speed)
				if (position && position.timestamp > current.lastTime) {
					const gpsSpeed = position.coords.speed
					if (!hasAccurateFix(position.coords) || (gpsSpeed === null && current.phase === "running")) {
						return invalidatePerformanceRun(current, "GPS accuracy or speed became unavailable.")
					}
					// Some devices omit speed at rest. Only a reported moving speed starts timing.
					return recordPerformanceSample(current, position.timestamp, (gpsSpeed ?? 0) * 3.6, position.coords.altitude)
				}
				const maxGap = current.phase === "armed" ? maxStandingFixAgeMs : maxSampleGapMs
				if (now - current.lastTime > maxGap) return invalidatePerformanceRun(current, "GPS updates were interrupted.")
				return current
			})
		}
		updateRun()
		const timer = window.setInterval(updateRun, 250)
		return () => window.clearInterval(timer)
	}, [active, manual, measuring, position, speed])

	useEffect(() => {
		if (run?.phase === "complete") usePerformanceResultsStore.getState().recordResult(run)
		if (run?.phase === "complete" || run?.phase === "invalid") onFinish()
	}, [run, onFinish])

	return { run, measuring, armBlockedMessage: armBlockReason(Date.now()), arm, cancel: () => setRun(null) }
}
