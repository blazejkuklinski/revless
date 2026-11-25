import { maxAccuracyMetres, maxFixGapMs, maxGpsSpeedKmh } from "./parameters"
import type { GpsFix } from "./hooks/useDrive"
export type Trip = {
	distanceKm: number
	elapsedMs: number
	topSpeed: number
	hasDistance: boolean
	hasSpeed: boolean
}

type Fix = { latitude: number; longitude: number; accuracy: number; timestamp: number }
export type TripState = Trip & { startedAt: number | null; lastManualUpdate: number; manualSpeed: number; anchor: Fix | null; lastFixTime: number; lastGpsSpeed: number | null }

function distanceBetween(a: Fix, b: Fix) {
	const radians = Math.PI / 180
	const latitude = (b.latitude - a.latitude) * radians
	const longitude = (b.longitude - a.longitude) * radians
	const haversine = Math.sin(latitude / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(longitude / 2) ** 2
	return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

export function snapshot(state: TripState, now: number): Trip {
	return {
		distanceKm: state.distanceKm,
		elapsedMs: state.startedAt === null ? state.elapsedMs : Math.max(0, now - state.startedAt),
		topSpeed: state.topSpeed,
		hasDistance: state.hasDistance,
		hasSpeed: state.hasSpeed
	}
}

export function advanceManual(state: TripState, now: number) {
	state.distanceKm += (state.manualSpeed * Math.max(0, now - state.lastManualUpdate)) / 3_600_000
	state.lastManualUpdate = now
}

export function recordGpsFix(current: TripState, position: GpsFix) {
	const { latitude, longitude, accuracy, speed: gpsSpeed } = position.coords
	const timestamp = position.timestamp
	if (!Number.isFinite(timestamp) || timestamp <= current.lastFixTime) return false

	const speed = gpsSpeed !== null && Number.isFinite(gpsSpeed) && gpsSpeed >= 0 && gpsSpeed * 3.6 <= maxGpsSpeedKmh ? gpsSpeed : null
	const accurate = Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= maxAccuracyMetres
	const fix = accurate ? { latitude, longitude, accuracy, timestamp } : null
	const previousSpeed = current.lastGpsSpeed
	const previousFixTime = current.lastFixTime
	current.lastGpsSpeed = speed
	current.lastFixTime = timestamp
	if (speed !== null) {
		current.hasSpeed = true
		current.topSpeed = Math.max(current.topSpeed, speed * 3.6)
	}
	if (fix || speed !== null) current.hasDistance = true

	const elapsed = timestamp - previousFixTime
	// Use reported speed when both samples have it, even if their coordinates are too coarse.
	if (previousSpeed !== null && speed !== null && elapsed <= maxFixGapMs) {
		current.distanceKm += (previousSpeed + speed) / 2 * elapsed / 1_000_000
		current.anchor = fix
	} else if (!fix || !current.anchor || elapsed > maxFixGapMs || speed === 0) {
		current.anchor = fix
	} else {
		const metres = distanceBetween(current.anchor, fix)
		const seconds = (timestamp - current.anchor.timestamp) / 1000
		const maxPlausible = (maxGpsSpeedKmh / 3.6) * seconds + current.anchor.accuracy + accuracy
		if (metres > maxPlausible) {
			current.anchor = fix
			return true
		}
		if (metres >= Math.max(5, Math.min(20, accuracy))) {
			current.distanceKm += metres / 1000
			current.anchor = fix
		}
	}
	return true
}
