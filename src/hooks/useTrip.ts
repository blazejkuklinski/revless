import { useEffect, useRef, useState } from "react"
import { emptyTrip } from "../parameters"
import type { GpsFix } from "./useDrive"
import { advanceManual, recordGpsFix, snapshot, type Trip, type TripState } from "../trip"

export function useTrip(manual: boolean, speed: number, position: GpsFix | null) {
	const [trip, setTrip] = useState<Trip>(emptyTrip)
	const [initialTime] = useState(() => performance.now())
	const state = useRef<TripState>({ ...emptyTrip, hasDistance: manual, hasSpeed: manual, startedAt: initialTime, lastManualUpdate: initialTime, manualSpeed: 0, anchor: null, lastFixTime: 0, lastGpsSpeed: null })

	const reset = () => {
		const now = performance.now()
		state.current = {
			...emptyTrip,
			hasDistance: state.current.hasDistance,
			hasSpeed: state.current.hasSpeed,
			startedAt: now,
			lastManualUpdate: now,
			manualSpeed: manual ? Math.max(0, speed) : 0,
			anchor: null,
			lastFixTime: Date.now(),
			lastGpsSpeed: null
		}
		setTrip(snapshot(state.current, now))
	}

	useEffect(() => {
		const interval = window.setInterval(() => {
			const time = performance.now()
			if (manual) {
				advanceManual(state.current, time)
				state.current.topSpeed = Math.max(state.current.topSpeed, state.current.manualSpeed)
			}
			setTrip(snapshot(state.current, time))
		}, 1000)
		return () => window.clearInterval(interval)
	}, [manual])

	useEffect(() => {
		if (!manual) return
		const now = performance.now()
		advanceManual(state.current, now)
		state.current.manualSpeed = Math.max(0, speed)
		state.current.topSpeed = Math.max(state.current.topSpeed, speed)
		setTrip(snapshot(state.current, now))
	}, [manual, speed])

	useEffect(() => {
		if (manual || !position) return
		if (recordGpsFix(state.current, position)) setTrip(snapshot(state.current, performance.now()))
	}, [manual, position])

	return { trip, reset }
}
