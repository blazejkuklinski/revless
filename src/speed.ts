import { kmPerMile } from "./parameters"

export type SpeedUnit = "metric" | "imperial"

export function toDisplaySpeed(kmh: number, unit: SpeedUnit) {
	return unit === "imperial" ? kmh / kmPerMile : kmh
}

export function toKmh(speed: number, unit: SpeedUnit) {
	return unit === "imperial" ? speed * kmPerMile : speed
}

export function speedUnitLabel(unit: SpeedUnit) {
	return unit === "imperial" ? "MPH" : "KM/H"
}

export function toDisplayDistance(km: number, unit: SpeedUnit) {
	return unit === "imperial" ? km / kmPerMile : km
}

export function distanceUnitLabel(unit: SpeedUnit) {
	return unit === "imperial" ? "MI" : "KM"
}
