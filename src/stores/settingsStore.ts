import { create } from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"
import { isEngineSound } from "../hooks/useEngineSound"
import { defaultSettings, mapZoomRange, storageKey, type EngineSound, type ShiftPreset } from "../parameters"
import type { SpeedUnit } from "../speed"

type Theme = "system" | "light" | "dark"
export type Settings = {
	maxRpm: number
	redZoneRpm: number
	gears: number
	shiftPreset: ShiftPreset
	theme: Theme
	mapZoom: number
	showStreetNames: boolean
	showPointsOfInterest: boolean
	accentColor: string
	sound: EngineSound
	volume: number
	maxSpeed: number
	speedUnit: SpeedUnit
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

// Accept the original plain settings object as well as Zustand's usual persisted shape.
function normalizeSettings(value: unknown): Settings {
	const saved = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
	const maxRpm = finite(saved.maxRpm) ? clamp(saved.maxRpm, 2000, 20000) : defaultSettings.maxRpm
	const redZoneRpm = finite(saved.redZoneRpm) ? clamp(Math.round(saved.redZoneRpm), 1000, maxRpm - 1) : Math.round(maxRpm * 0.9)
	const gears = finite(saved.gears) ? clamp(Math.round(saved.gears), 1, 12) : defaultSettings.gears
	const maxSpeed = finite(saved.maxSpeed) ? clamp(saved.maxSpeed, 30, 500) : defaultSettings.maxSpeed
	return {
		maxRpm,
		redZoneRpm,
		gears,
		shiftPreset: saved.shiftPreset === "insane" ? "sport" : saved.shiftPreset === "chill" || saved.shiftPreset === "sport" ? saved.shiftPreset : defaultSettings.shiftPreset,
		maxSpeed,
		theme: saved.theme === "light" || saved.theme === "dark" ? saved.theme : "system",
		mapZoom: finite(saved.mapZoom) ? clamp(saved.mapZoom, mapZoomRange.min, mapZoomRange.max) : defaultSettings.mapZoom,
		showStreetNames: saved.showStreetNames === true,
		showPointsOfInterest: saved.showPointsOfInterest === true,
		accentColor: typeof saved.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(saved.accentColor) ? saved.accentColor.toLowerCase() : defaultSettings.accentColor,
		sound: isEngineSound(saved.sound) ? saved.sound : defaultSettings.sound,
		volume: finite(saved.volume) ? clamp(saved.volume, 0, 100) : defaultSettings.volume,
		speedUnit: saved.speedUnit === "imperial" ? "imperial" : "metric"
	}
}

type SettingsStore = {
	settings: Settings
	resetSettings: () => void
	setMaxRpm: (value: number) => void
	setRedZoneRpm: (value: number) => void
	setGears: (value: number) => void
	setShiftPreset: (value: ShiftPreset) => void
	setMaxSpeed: (value: number) => void
	setSpeedUnit: (value: SpeedUnit) => void
	setTheme: (value: Theme) => void
	setMapZoom: (value: number) => void
	setShowStreetNames: (value: boolean) => void
	setShowPointsOfInterest: (value: boolean) => void
	setAccentColor: (value: string) => void
	setSound: (value: EngineSound) => void
	setVolume: (value: number) => void
}

// Keep the existing storage key and plain JSON format so previous settings survive.
// Browsers can deny storage access; settings still work for the current session.
const settingsStorage: PersistStorage<{ settings: Settings }> = {
	getItem: (name) => {
		try {
			const raw = localStorage.getItem(name)
			if (!raw) return null
			const parsed = JSON.parse(raw)
			const value = parsed?.state?.settings ?? parsed?.settings ?? parsed
			return { state: { settings: normalizeSettings(value) }, version: 0 }
		} catch {
			return null
		}
	},
	setItem: (name, value) => {
		try {
			localStorage.setItem(name, JSON.stringify(value.state.settings))
		} catch {
			/* In-memory settings remain available. */
		}
	},
	removeItem: (name) => {
		try {
			localStorage.removeItem(name)
		} catch {
			/* Storage may be unavailable. */
		}
	}
}

export const useSettingsStore = create<SettingsStore>()(
	persist(
		(set, get) => ({
			settings: { ...defaultSettings },
			resetSettings: () => set({ settings: { ...defaultSettings } }),
			setMaxRpm: (value) =>
				set(({ settings }) => {
					const maxRpm = clamp(value || 2000, 2000, 20000)
					return { settings: { ...settings, maxRpm, redZoneRpm: Math.min(settings.redZoneRpm, maxRpm - 1) } }
				}),
			setRedZoneRpm: (value) => set(({ settings }) => ({ settings: { ...settings, redZoneRpm: clamp(Math.round(value), 1000, settings.maxRpm - 1) } })),
			setGears: (value) => set(({ settings }) => ({ settings: { ...settings, gears: clamp(Math.round(value || 1), 1, 12) } })),
			setShiftPreset: (shiftPreset) => set(({ settings }) => ({ settings: { ...settings, shiftPreset } })),
			setMaxSpeed: (value) => set(({ settings }) => ({ settings: { ...settings, maxSpeed: clamp(value, 30, 500) } })),
			setSpeedUnit: (speedUnit) => set(({ settings }) => ({ settings: { ...settings, speedUnit } })),
			setTheme: (theme) => set(({ settings }) => ({ settings: { ...settings, theme } })),
			setMapZoom: (value) => {
				if (!finite(value)) return
				const mapZoom = clamp(value, mapZoomRange.min, mapZoomRange.max)
				if (get().settings.mapZoom !== mapZoom) set(({ settings }) => ({ settings: { ...settings, mapZoom } }))
			},
			setShowStreetNames: (showStreetNames) => set(({ settings }) => ({ settings: { ...settings, showStreetNames } })),
			setShowPointsOfInterest: (showPointsOfInterest) => set(({ settings }) => ({ settings: { ...settings, showPointsOfInterest } })),
			setAccentColor: (accentColor) => {
				if (/^#[0-9a-f]{6}$/i.test(accentColor)) set(({ settings }) => ({ settings: { ...settings, accentColor: accentColor.toLowerCase() } }))
			},
			setSound: (sound) => set(({ settings }) => ({ settings: { ...settings, sound } })),
			setVolume: (volume) => set(({ settings }) => ({ settings: { ...settings, volume: clamp(volume, 0, 100) } }))
		}),
		{ name: storageKey, storage: settingsStorage, partialize: (state) => ({ settings: state.settings }) }
	)
)
