import { useEffect, useMemo, useRef, useState } from "react"
import { idleRpm } from "../parameters"
import { advanceTransmission, createTransmission, createTransmissionState, recordTransmissionSpeed, type EngineTelemetry, type TransmissionSettings } from "../transmission"
import type { GpsFix } from "./useDrive"

export function useTransmission(active: boolean, manualSpeed: number | null, position: GpsFix | null, settings: TransmissionSettings) {
	const { gears, maxSpeed, maxRpm, redZoneRpm, shiftPreset } = settings
	const transmission = useMemo(
		() => createTransmission({ gears, maxSpeed, maxRpm, redZoneRpm, shiftPreset }),
		[gears, maxSpeed, maxRpm, redZoneRpm, shiftPreset]
	)
	const inputs = useRef({ transmission, manualSpeed, position })
	inputs.current = { transmission, manualSpeed, position }
	const [telemetry, setTelemetry] = useState<EngineTelemetry>({ gear: null, rpm: idleRpm })

	useEffect(() => {
		if (!active) {
			setTelemetry({ gear: null, rpm: idleRpm })
			return
		}

		const state = createTransmissionState(performance.now())
		let previousFixTime = -Infinity
		// A fixed update cadence keeps React and Web Audio work bounded on high-refresh displays.
		const timer = window.setInterval(() => {
			const now = performance.now()
			const { transmission, manualSpeed, position } = inputs.current
			if (manualSpeed === null && position && position.timestamp > previousFixTime) {
				previousFixTime = position.timestamp
				const gpsSpeed = position.coords.speed
				if (gpsSpeed !== null) {
					const sampledAt = now - Math.max(0, Date.now() - position.timestamp)
					recordTransmissionSpeed(state, gpsSpeed * 3.6, sampledAt, now)
				}
			}

			const next = advanceTransmission(state, transmission, now, manualSpeed)
			setTelemetry((current) => current.gear === next.gear && current.rpm === next.rpm ? current : next)
		}, 1000 / 30)
		return () => window.clearInterval(timer)
	}, [active])

	return telemetry
}
