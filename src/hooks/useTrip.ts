import { useEffect, useRef, useState } from "react"
import { emptyTrip } from "../parameters"
import type { GpsFix } from "./useDrive"
import { advanceManual, recordGpsFix, snapshot, type Trip, type TripState } from "../trip"

export function useTrip(active: boolean, manual: boolean, speed: number, position: GpsFix | null) {
	const [trip, setTrip] = useState<Trip>(emptyTrip)
	const state = useRef<TripState>({ ...emptyTrip, startedAt: null, lastManualUpdate: 0, manualSpeed: 0, anchor: null, lastFixTime: 0, lastGpsSpeed: null })

	useEffect(() => {
		const now = performance.now()
		if (!active) {
			if (state.current.startedAt !== null) {
				if (manual) advanceManual(state.current, now)
				const final = snapshot(state.current, now)
				state.current.startedAt = null
				state.current.elapsedMs = final.elapsedMs
				setTrip(final)
			}
			return
		}
		state.current = { ...emptyTrip, hasDistance: manual, hasSpeed: manual, startedAt: now, lastManualUpdate: now, manualSpeed: 0, anchor: null, lastFixTime: 0, lastGpsSpeed: null }
		setTrip(snapshot(state.current, now))
		const interval = window.setInterval(() => {
			const time = performance.now()
			if (manual) advanceManual(state.current, time)
			setTrip(snapshot(state.current, time))
		}, 1000)
		return () => window.clearInterval(interval)
	}, [active, manual])

	useEffect(() => {
		if (!active || !manual || state.current.startedAt === null) return
		const now = performance.now()
		advanceManual(state.current, now)
		state.current.manualSpeed = Math.max(0, speed)
		state.current.topSpeed = Math.max(state.current.topSpeed, speed)
		setTrip(snapshot(state.current, now))
	}, [active, manual, speed])

	useEffect(() => {
		if (!active || manual || !position || state.current.startedAt === null) return
		if (recordGpsFix(state.current, position)) setTrip(snapshot(state.current, performance.now()))
	}, [active, manual, position])

	return trip
}
