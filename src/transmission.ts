import { idleRpm, maxGpsSpeedKmh, shiftPresets, transmissionTuning as tuning, type ShiftPreset } from "./parameters"

export type TransmissionSettings = {
	gears: number
	maxSpeed: number
	maxRpm: number
	redZoneRpm: number
	shiftPreset: ShiftPreset
}

type Transmission = ReturnType<typeof createTransmission>
type SpeedSample = { speed: number; time: number }
export type EngineTelemetry = { gear: number | null; rpm: number }
type TransmissionState = ReturnType<typeof createTransmissionState>

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const smooth = (current: number, target: number, seconds: number, response: number) => current + (target - current) * (1 - Math.exp(-seconds / response))

export function createTransmission(props: TransmissionSettings) {
	const topGearRate = props.redZoneRpm / props.maxSpeed
	const spread = Math.min(tuning.maxRatioSpread, tuning.maxRatioStep ** (props.gears - 1))
	const rpmPerKmh = Array.from({ length: props.gears }, (_, index) => {
		const remaining = 1 - index / Math.max(1, props.gears - 1)
		return topGearRate * spread ** (remaining ** tuning.ratioProgression)
	})

	return { rpmPerKmh, maxRpm: props.maxRpm, redZoneRpm: props.redZoneRpm, shiftPreset: props.shiftPreset, profile: shiftPresets[props.shiftPreset] }
}

export function createTransmissionState(now: number) {
	return {
		now,
		gear: 1,
		rpm: idleRpm,
		speed: 0,
		acceleration: 0,
		sampleAcceleration: 0,
		sample: null as SpeedSample | null,
		suspect: null as SpeedSample | null,
		shift: null as { fromRpm: number; startedAt: number; duration: number } | null,
		holdUntil: now
	}
}

function plausibleChange(previous: SpeedSample, next: SpeedSample) {
	const seconds = (next.time - previous.time) / 1000
	const change = next.speed - previous.speed
	const rate = change >= 0 ? tuning.maxAcceleration : tuning.maxDeceleration

	return seconds > 0 && Math.abs(change) <= tuning.speedNoiseKmh + rate * 3.6 * seconds
}

// Confirm implausible GPS jumps with a second fix before changing the speed target.
export function recordTransmissionSpeed(state: TransmissionState, speed: number, time: number, now: number) {
	const previous = state.sample
	if (!Number.isFinite(speed) || speed < 0 || speed > maxGpsSpeedKmh || !Number.isFinite(time) || now - time > tuning.fixTimeoutMs || (previous && time <= previous.time)) return

	const sample = { speed: speed <= tuning.stoppedKmh ? 0 : speed, time }
	const continuous = previous && time - previous.time <= tuning.fixTimeoutMs
	if (continuous && !plausibleChange(previous, sample)) {
		if (!state.suspect || !plausibleChange(state.suspect, sample)) {
			state.suspect = sample
			return
		}
		state.sampleAcceleration = 0
	} else if (continuous) {
		const seconds = (time - previous.time) / 1000
		if (sample.speed > 0 && previous.speed > 0 && Math.abs(sample.speed - previous.speed) < tuning.speedDeadbandKmh) sample.speed = previous.speed
		const acceleration = clamp((sample.speed - previous.speed) / 3.6 / seconds, -tuning.maxDeceleration, tuning.maxAcceleration)
		state.sampleAcceleration = smooth(state.sampleAcceleration, acceleration, seconds, tuning.accelerationResponseSeconds)
	} else {
		state.sampleAcceleration = 0
	}
	if (!previous && sample.speed > 0) {
		state.speed = sample.speed
		state.gear = 0
	}

	state.sample = sample
	state.suspect = null
}

function rpmInGear(transmission: Transmission, speed: number, gear: number) {
	const coupledRpm = speed * transmission.rpmPerKmh[gear - 1]
	if (gear > 1) return Math.max(idleRpm, coupledRpm)

	// Blend from idle to the locked first-gear ratio as the car starts moving.
	const launchRpm = idleRpm + (transmission.redZoneRpm - idleRpm) * tuning.launchRise
	return Math.max(coupledRpm, idleRpm + (launchRpm - idleRpm) * Math.min(1, coupledRpm / launchRpm))
}

function selectGear(state: TransmissionState, transmission: Transmission, fresh: boolean, startingMidDrive = false) {
	const { profile, redZoneRpm, rpmPerKmh } = transmission
	const { gear, speed, acceleration, now, holdUntil } = state

	if (!fresh) return gear

	const rpm = rpmInGear(transmission, speed, gear)
	const span = redZoneRpm - idleRpm
	const load = clamp((acceleration - tuning.accelerationDeadband) / tuning.fullLoadAcceleration, 0, 1)
	const upshiftRpm = idleRpm + span * (profile.cruise + (profile.acceleration - profile.cruise) * load)
	// Sport holds the gear until the simulated engine reaches the shift point.
	// A GPS fix that starts mid-drive has no previous RPM to wait for.
	const upshiftReady = startingMidDrive || transmission.shiftPreset !== "sport" || state.rpm >= upshiftRpm
	// Recover from a large speed jump or shorter gearing without running past redline.
	if (gear < rpmPerKmh.length && upshiftReady && rpm > redZoneRpm + span * tuning.overrunMargin) {
		let safeGear = gear + 1
		while (safeGear < rpmPerKmh.length && rpmInGear(transmission, speed, safeGear) > redZoneRpm) safeGear++
		return safeGear
	}

	if (now < holdUntil) return gear

	const downshiftRpm = idleRpm + span * (profile.downshift + load * tuning.shiftMargin)
	const margin = span * tuning.shiftMargin
	if (gear < rpmPerKmh.length && upshiftReady && rpm >= upshiftRpm && acceleration >= tuning.brakingThreshold && rpmInGear(transmission, speed, gear + 1) >= downshiftRpm + margin) return gear + 1

	if (gear === 1) return gear
	const downshiftCeiling = upshiftRpm - margin
	const lowerRpm = rpmInGear(transmission, speed, gear - 1)

	if (lowerRpm > downshiftCeiling || lowerRpm >= redZoneRpm) return gear

	if (acceleration >= profile.kickdown) {
		let lower = gear - 1
		while (lower > 1 && rpmInGear(transmission, speed, lower - 1) <= downshiftCeiling) lower--
		return lower
	}

	return rpm < downshiftRpm ? gear - 1 : gear
}

export function advanceTransmission(state: TransmissionState, transmission: Transmission, now: number, manualSpeed: number | null): EngineTelemetry {
	const seconds = clamp((now - state.now) / 1000, 0, 0.1)
	state.now = now
	const age = state.sample ? now - state.sample.time : Infinity
	const fresh = manualSpeed !== null || age <= tuning.fixHoldMs
	let target = manualSpeed ?? (age <= tuning.fixTimeoutMs ? (state.sample?.speed ?? 0) : 0)

	if (target <= tuning.stoppedKmh) target = 0

	const previousSpeed = state.speed
	const nextSpeed = smooth(previousSpeed, target, seconds, tuning.speedResponseSeconds)
	const maxChange = (target >= previousSpeed ? tuning.maxAcceleration : tuning.maxDeceleration) * 3.6 * seconds
	const acceleration = manualSpeed !== null ? (seconds > 0 ? (state.speed - previousSpeed) / seconds / 3.6 : 0) : fresh ? state.sampleAcceleration : 0

	state.speed += clamp(nextSpeed - previousSpeed, -maxChange, maxChange)
	state.acceleration = smooth(state.acceleration, acceleration, seconds, tuning.accelerationResponseSeconds)

	if (state.speed <= tuning.stoppedKmh && target === 0) {
		state.speed = 0
		state.gear = 1
		state.shift = null
		state.holdUntil = now
		state.rpm = Math.min(transmission.maxRpm, smooth(state.rpm, idleRpm, seconds, tuning.rpmResponseSeconds))
		return { gear: null, rpm: Math.min(transmission.maxRpm, Math.round(state.rpm)) }
	}

	if (state.gear === 0) {
		// Starting mid-drive should engage a cruising gear without replaying earlier shifts.
		state.gear = 1
		for (let gear = selectGear(state, transmission, fresh, true); gear > state.gear; gear = selectGear(state, transmission, fresh, true)) {
			state.gear = gear
		}
	}

	state.gear = Math.min(state.gear, transmission.rpmPerKmh.length)
	const gear = selectGear(state, transmission, fresh)
	if (state.gear !== gear) {
		const { shiftSeconds, holdSeconds } = transmission.profile
		state.shift = { fromRpm: state.rpm, startedAt: now, duration: shiftSeconds * 1000 }
		state.holdUntil = now + (shiftSeconds + holdSeconds) * 1000
		state.gear = gear
	}

	const targetRpm = Math.min(transmission.redZoneRpm, rpmInGear(transmission, state.speed, gear))
	if (state.shift) {
		const progress = clamp((now - state.shift.startedAt) / state.shift.duration, 0, 1)
		const blend = progress ** 2 * (3 - 2 * progress)
		state.rpm = state.shift.fromRpm + (targetRpm - state.shift.fromRpm) * blend
		if (progress === 1) state.shift = null
	} else {
		state.rpm = smooth(state.rpm, targetRpm, seconds, tuning.rpmResponseSeconds)
	}
	state.rpm = clamp(state.rpm, idleRpm, transmission.maxRpm)

	return { gear, rpm: Math.min(transmission.maxRpm, Math.round(state.rpm)) }
}
