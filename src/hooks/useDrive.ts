import { toast } from "@heroui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { earliestGpsTimestamp } from "../parameters"

export type GpsStatus = "idle" | "searching" | "connected" | "error"
export type GpsFix = Pick<GeolocationPosition, "coords" | "timestamp"> & { usesReceiptTime: boolean }

function normalizeFix(position: GeolocationPosition, receivedAt: number): GpsFix {
	const { coords, timestamp } = position
	const usesReceiptTime = !Number.isFinite(timestamp) || timestamp < earliestGpsTimestamp || timestamp > receivedAt
	return { coords, timestamp: usesReceiptTime ? receivedAt : timestamp, usesReceiptTime }
}

export function useDrive() {
	const [speed, setSpeed] = useState(0)
	const [status, setStatus] = useState<GpsStatus>("idle")
	const [message, setMessage] = useState("Ready when you are")
	const [position, setPosition] = useState<GpsFix | null>(null)
	const [driving, setDriving] = useState(false)
	const stopWatching = useRef<(() => void) | null>(null)
	const requestFreshFix = useRef<(() => void) | null>(null)
	const onDriveError = useRef<(() => void) | null>(null)
	const lastError = useRef("")

	const watchLocation = useCallback(() => {
		stopWatching.current?.()
		let stopped = false
		let watchId: number | null = null
		let retryId: number | null = null
		let retryPending = false
		let refreshPending = false
		let latestFixTime = 0
		let fixCount = 0
		const cleanup = () => {
			stopped = true
			requestFreshFix.current = null
			if (watchId !== null) navigator.geolocation.clearWatch(watchId)
			if (retryId !== null) window.clearTimeout(retryId)
		}
		stopWatching.current = cleanup
		const reportError = (message: string, endDrive: boolean) => {
			setStatus("error")
			setMessage(message)
			if (lastError.current !== message) toast.danger(message, { timeout: 6000 })
			lastError.current = message
			if (endDrive) {
				setDriving(false)
				onDriveError.current?.()
				onDriveError.current = null
			}
		}
		if (!navigator.geolocation) {
			stopWatching.current = null
			reportError("Geolocation is not supported on this device", true)
			return
		}
		setStatus("searching")
		setMessage("Acquiring GPS signal")
		const onPosition = (browserPosition: GeolocationPosition) => {
			if (stopped) return
			const position = normalizeFix(browserPosition, Date.now())
			if (position.timestamp < latestFixTime) return
			latestFixTime = position.timestamp
			fixCount++
			if (retryId !== null) window.clearTimeout(retryId)
			retryId = null
			retryPending = false
			const value = position.coords.speed
			lastError.current = ""
			setPosition(position)
			setSpeed(value !== null && Number.isFinite(value) ? Math.max(0, value * 3.6) : 0)
			setStatus("connected")
			setMessage(value === null ? "GPS connected · speed unavailable" : "GPS signal active")
		}
		const onError = (error: GeolocationPositionError) => {
			if (stopped) return
			reportError(error.code === 1 ? "Location permission denied" : "GPS signal unavailable", error.code === 1)
			if (error.code === 1) {
				cleanup()
				stopWatching.current = null
			} else if (!retryPending) {
				// Keep the watch alive and also retry a single fix after temporary failures.
				retryPending = true
				retryId = window.setTimeout(() => {
					retryId = null
					const previousFixCount = fixCount
					navigator.geolocation.getCurrentPosition(onPosition, (retryError) => {
						if (stopped || previousFixCount !== fixCount) return
						retryPending = false
						onError(retryError)
					}, { enableHighAccuracy: false, maximumAge: 0, timeout: 5000 })
				}, 1000)
			}
		}
		requestFreshFix.current = () => {
			if (refreshPending) return
			refreshPending = true
			navigator.geolocation.getCurrentPosition(
				(fix) => {
					refreshPending = false
					onPosition(fix)
				},
				() => { refreshPending = false },
				{ enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
			)
		}
		watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 })
	}, [])

	useEffect(() => {
		watchLocation()
		return () => {
			stopWatching.current?.()
			stopWatching.current = null
		}
	}, [watchLocation])

	const start = (onError: () => void) => {
		onDriveError.current = onError
		setDriving(true)
		if (!stopWatching.current || status === "error") watchLocation()
	}
	const stop = () => {
		setDriving(false)
		onDriveError.current = null
	}

	const refreshLocation = useCallback(() => requestFreshFix.current?.(), [])

	return { speed, status, message, position, driving, start, stop, refreshLocation }
}
