import seventeen from "./assets/engine/2017.mp3"
import fourteen from "./assets/engine/M14.mp3"
import startup from "./assets/engine/Start.mp3"
import xspace from "./assets/engine/XSpace.mp3"
import coffeeQr from "./assets/images/buymeacoffee.png"
import teslaQr from "./assets/images/tesla.png"
import type { Settings } from "./stores/settingsStore"
import type { Trip } from "./trip"

// Labels and audio assets for the available engine recordings.
export const engineSamples = {
	fourteen: { label: "Growl", url: fourteen },
	seventeen: { label: "Vroom", url: seventeen },
	sciFi: { label: "XSpace", url: xspace }
}

export const sponsorLinks = [
	{ label: "Buy me a coffee", href: "https://buymeacoffee.com/bajo", qr: coffeeQr },
	{ label: "Tesla referral", href: "https://www.tesla.com/pl_pl/referral/baej574307", qr: teslaQr }
]

type RecordedSound = keyof typeof engineSamples

export type EngineSound = RecordedSound | "off"

// Recording IDs in playback and display order.
export const engineSounds = Object.keys(engineSamples) as RecordedSound[]

// Audio clip played once at ignition.
export const engineStartupSample = startup

// Playback rate at idle, relative to the original recording.
export const minEnginePlaybackRate = 0.5

// Upper playback-rate limit even when the configured RPM range is very wide.
export const maxEnginePlaybackRate = 5

// Linear share of the pitch curve, giving low RPM more audible change.
export const enginePitchLinearWeight = 0.4

// Simulated engine speed at idle.
export const idleRpm = 955

// Maximum deviation from idle RPM on the gauge.
export const idleRpmFluctuation: number = 5

// Fraction of the engine volume used at idle.
export const idleVolume = 0.5

// Engine loop reaches the selected volume at this RPM.
export const engineVolumePeakRpm = 2500

// Maximum gain for the ignition clip at full master volume.
export const startupOutputGain = 0.3

// Overlap between the ignition clip and the engine loop, in seconds.
export const startupCrossfadeSeconds = 1

// Overlap at each engine loop seam, measured at the recording's original speed.
export const loopCrossfadeSeconds = 0.5

// Hostnames that enable manual driving controls.
export const localhostHostnames = ["localhost", "127.0.0.1", "[::1]", "::1"]

// Left-hand traffic regions, where the driver's seat is typically on the right.
// https://github.com/streetcomplete/countrymetadata/blob/master/data/isLeftHandTraffic.yml
export const leftHandTrafficRegions = new Set([
	"AG",
	"AI",
	"AU",
	"BB",
	"BD",
	"BM",
	"BN",
	"BS",
	"BT",
	"BW",
	"CC",
	"CK",
	"CX",
	"CY",
	"DM",
	"FJ",
	"FK",
	"GB",
	"GD",
	"GG",
	"GS",
	"GY",
	"HK",
	"ID",
	"IE",
	"IM",
	"IN",
	"JE",
	"JM",
	"JP",
	"KE",
	"KI",
	"KN",
	"KY",
	"LC",
	"LK",
	"LS",
	"MO",
	"MS",
	"MT",
	"MU",
	"MV",
	"MW",
	"MY",
	"MZ",
	"NA",
	"NF",
	"NP",
	"NR",
	"NU",
	"NZ",
	"PG",
	"PK",
	"PN",
	"SB",
	"SC",
	"SG",
	"SH",
	"SR",
	"SZ",
	"TC",
	"TH",
	"TK",
	"TL",
	"TO",
	"TT",
	"TV",
	"TZ",
	"UG",
	"VC",
	"VG",
	"VI",
	"WS",
	"ZA",
	"ZM",
	"ZW"
])

// Kilometres in one mile.
export const kmPerMile = 1.609344

// Shift points are fractions of the RPM range between idle and redline.
// Kickdown thresholds are in m/s². Shift times and minimum gear hold times are in seconds.
export const shiftPresets = {
	chill: { cruise: 0.22, acceleration: 0.42, downshift: 0.06, kickdown: 3.1, shiftSeconds: 0.55, holdSeconds: 1.15 },
	standard: { cruise: 0.35, acceleration: 0.72, downshift: 0.12, kickdown: 2, shiftSeconds: 0.38, holdSeconds: 0.9 },
	sport: { cruise: 0.98, acceleration: 0.98, downshift: 0.19, kickdown: 1.3, shiftSeconds: 0.23, holdSeconds: 0.75 }
}
export type ShiftPreset = keyof typeof shiftPresets

// Gear spacing, speed filtering and GPS freshness for the virtual transmission.
export const transmissionTuning = {
	maxRatioSpread: 4.4,
	maxRatioStep: 1.5,
	ratioProgression: 1.25,
	stoppedKmh: 0.8,
	speedDeadbandKmh: 0.45,
	speedNoiseKmh: 3,
	maxAcceleration: 7,
	maxDeceleration: 11,
	speedResponseSeconds: 0.35,
	accelerationResponseSeconds: 0.45,
	rpmResponseSeconds: 0.12,
	fullLoadAcceleration: 2.8,
	accelerationDeadband: 0.2,
	brakingThreshold: -0.35,
	fixHoldMs: 2500,
	fixTimeoutMs: 4500,
	launchRise: 0.1,
	shiftMargin: 0.06,
	overrunMargin: 0.04
}

// Maximum GPS uncertainty accepted for trip distance.
export const maxAccuracyMetres = 50

// Highest GPS speed accepted by trip tracking.
export const maxGpsSpeedKmh = 500

// Longest gap between GPS fixes accepted for trip distance.
export const maxFixGapMs = 30_000

// Reject GPS timestamps near the Unix epoch that some browsers report for live fixes.
export const earliestGpsTimestamp = Date.UTC(2000, 0, 1)

// Initial trip totals before any samples are recorded.
export const emptyTrip: Trip = {
	distanceKm: 0,
	elapsedMs: 0,
	topSpeed: 0,
	hasDistance: false,
	hasSpeed: false
}

// Target distance for a quarter-mile performance run.
export const quarterMileMetres = 402.336

// Finish speed for the 0–100 km/h performance test.
export const performanceTargetKmh = 100

// Maximum gap between GPS samples during a performance run.
export const maxSampleGapMs = 5000

// GPS refresh cadence while preparing a performance run.
export const performanceGpsRefreshMs = 3000

// A stationary fix can arrive less often than speed samples during a timed run.
export const maxStandingFixAgeMs = 15_000

// Speed that marks the start of a performance run.
export const startSpeedKmh = 1

// Maximum GPS uncertainty in metres when arming a performance run.
export const maxGpsAccuracy = 30

// Peak RPM reached during ignition.
export const startupPeakRpm = 1500

// Duration of each phase of the ignition RPM ramp.
export const startupPhaseMs = 1000

// Default minimap zoom and supported range.
export const mapZoom = 15
export const mapZoomRange = { min: -2, max: 22 }

// OpenFreeMap style URLs for light and dark themes.
export const mapStyle = {
	light: "https://tiles.openfreemap.org/styles/positron",
	dark: "https://tiles.openfreemap.org/styles/dark"
}

// Settings used on first launch and after a reset.
export const defaultSettings: Settings = {
	maxRpm: 8000,
	redZoneRpm: 6500,
	gears: 6,
	shiftPreset: "standard",
	theme: "system",
	mapZoom,
	showStreetNames: false,
	showPointsOfInterest: false,
	accentColor: "#3e6ae1",
	sound: "fourteen",
	volume: 90,
	maxSpeed: 250,
	speedUnit: "metric"
}

// Local storage key used for saved settings.
export const storageKey = "engine-drive-settings"

// Local storage key for the last and best times for each performance test.
export const performanceResultsStorageKey = "engine-drive-performance-results"

export const weatherUpdateIntervalMinutes = 20
