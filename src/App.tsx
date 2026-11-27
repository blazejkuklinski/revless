import { Toast } from "@heroui/react"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { AboutModal } from "./components/AboutModal"
import { DiagnosticDrawer } from "./components/DiagnosticDrawer"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { PerformanceDrawer } from "./components/PerformanceDrawer"
import { PerformanceStatusToast } from "./components/PerformanceStatusToast"
import { SettingsDrawer } from "./components/SettingsDrawer"
import { SpeedControlDrawer } from "./components/SpeedControlDrawer"
import { SpeedDisplay } from "./components/SpeedDisplay"
import { useDrive } from "./hooks/useDrive"
import { useDrivingControls } from "./hooks/useDrivingControls"
import { useEngineSound } from "./hooks/useEngineSound"
import { usePerformanceRun } from "./hooks/usePerformanceRun"
import { useTransmission } from "./hooks/useTransmission"
import { useTrip } from "./hooks/useTrip"
import { idleRpm, leftHandTrafficRegions, localhostHostnames, performanceGpsRefreshMs, startupPeakRpm, startupPhaseMs } from "./parameters"
import type { PerformanceMode } from "./performance"
import { useSettingsStore } from "./stores/settingsStore"
import "./style.css"

const isLocalhost = localhostHostnames.includes(window.location.hostname)

function usesRightHandDrive() {
	try {
		const { region } = new Intl.Locale(navigator.language)
		return region !== undefined && leftHandTrafficRegions.has(region)
	} catch {
		return false
	}
}

function accentForeground(color: string) {
	const channels = [1, 3, 5].map((offset) => {
		const channel = parseInt(color.slice(offset, offset + 2), 16) / 255
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.179 ? "#000000" : "#ffffff"
}

function App() {
	const rightHandDrive = usesRightHandDrive()
	const drawerPlacement = rightHandDrive ? "right" : "left"
	const [manualSpeed, setManualSpeed] = useState(0)
	const [soundActive, setSoundActive] = useState(false)
	const [ignitionStartedAt, setIgnitionStartedAt] = useState<number | null>(null)
	const [ignitionRpm, setIgnitionRpm] = useState<number | null>(null)
	const settings = useSettingsStore((state) => state.settings)
	const [darkSystem, setDarkSystem] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
	const dark = settings.theme === "system" ? darkSystem : settings.theme === "dark"
	const drive = useDrive()
	const controls = useDrivingControls()
	const { headerVisible } = controls
	const speed = isLocalhost ? Math.min(manualSpeed, settings.maxSpeed) : drive.speed
	const { gear, rpm: drivingRpm } = useTransmission(isLocalhost ? speed : null, drive.position, settings)
	const rpm = Math.min(settings.maxRpm, ignitionRpm ?? drivingRpm)
	const sound = useEngineSound(rpm, settings.maxRpm, settings.volume, settings.sound, speed)
	const { trip, reset: resetTrip } = useTrip(isLocalhost, speed, drive.position)
	const performanceRun = usePerformanceRun(isLocalhost, speed, drive.position, controls.openPerformance)
	const refreshPerformanceGps = !isLocalhost && (controls.performanceOpen || performanceRun.run?.phase === "armed")
	const { refreshLocation } = drive

	const armPerformance = (mode: PerformanceMode) => {
		if (!performanceRun.arm(mode, settings.speedUnit)) return false
		controls.closePerformance()
		return true
	}

	const toggleSound = async () => {
		if (soundActive) {
			sound.stop()
			setSoundActive(false)
			setIgnitionStartedAt(null)
			setIgnitionRpm(null)
		} else if (await sound.start(() => {
			setIgnitionStartedAt(performance.now())
			setIgnitionRpm(0)
		})) {
			setSoundActive(true)
		}
	}

	useEffect(() => {
		const startedAt = ignitionStartedAt
		if (startedAt === null) return

		const updateIgnitionRpm = (now: number) => {
			const phase = Math.max(0, now - startedAt) / startupPhaseMs
			if (phase >= 2) {
				setIgnitionStartedAt(null)
				setIgnitionRpm(null)
				return
			}
			setIgnitionRpm(phase < 1 ? startupPeakRpm * phase : startupPeakRpm + (idleRpm - startupPeakRpm) * (phase - 1))
			frame = requestAnimationFrame(updateIgnitionRpm)
		}

		let frame = requestAnimationFrame(updateIgnitionRpm)
		return () => cancelAnimationFrame(frame)
	}, [ignitionStartedAt])

	useEffect(() => {
		setManualSpeed((current) => Math.min(current, settings.maxSpeed))
	}, [settings.maxSpeed])

	useEffect(() => {
		if (!refreshPerformanceGps) return
		refreshLocation()
		const timer = window.setInterval(refreshLocation, performanceGpsRefreshMs)
		return () => window.clearInterval(timer)
	}, [refreshLocation, refreshPerformanceGps])

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)")
		const listener = (event: MediaQueryListEvent) => setDarkSystem(event.matches)
		media.addEventListener("change", listener)
		return () => media.removeEventListener("change", listener)
	}, [])

	useEffect(() => {
		document.documentElement.dataset.theme = dark ? "dark" : "light"
	}, [dark])

	useEffect(() => {
		document.documentElement.style.setProperty("--accent", settings.accentColor)
		document.documentElement.style.setProperty("--accent-foreground", accentForeground(settings.accentColor))
	}, [settings.accentColor])

	return (
		<div className="flex h-dvh flex-col overflow-clip bg-background text-foreground" onClick={controls.handleScreenClick}>
			<Toast.Provider placement="top" />
			{performanceRun.measuring && <PerformanceStatusToast startedAt={performanceRun.run?.startedAt ?? null} onOpen={controls.openPerformance} />}

			<SettingsDrawer open={controls.settingsOpen} placement={drawerPlacement} onClose={controls.closeSettings} />
			<DiagnosticDrawer open={controls.gpsOpen} placement={drawerPlacement} position={drive.position} message={drive.message} onClose={controls.closeGps} />
			<AboutModal open={controls.aboutOpen} onClose={controls.closeAbout} />
			<PerformanceDrawer
				open={controls.performanceOpen}
				placement={drawerPlacement}
				onClose={controls.closePerformance}
				manual={isLocalhost}
				armBlockedMessage={performanceRun.armBlockedMessage}
				run={performanceRun.run}
				onStart={armPerformance}
				onCancel={performanceRun.cancel}
			/>

			{isLocalhost && <SpeedControlDrawer open={controls.manualSpeedOpen} speed={speed} maxSpeed={settings.maxSpeed} unit={settings.speedUnit} onChange={setManualSpeed} onClose={controls.closeManualSpeed} />}

			<div className={clsx("grid shrink-0 transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none", headerVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
				<div id="driving-header" className="min-h-0 overflow-hidden" inert={!headerVisible}>
					<div className={clsx("transition-transform duration-300 ease-in-out motion-reduce:transition-none", !headerVisible && "-translate-y-full")}>
						<Header
							rightHandDrive={rightHandDrive}
							active={soundActive}
							onToggle={toggleSound}
							onOpenSettings={controls.openSettings}
							onOpenPerformance={controls.openPerformance}
							onOpenGps={controls.openGps}
							onOpenAbout={controls.openAbout}
							manual={isLocalhost}
							onToggleManualSpeed={controls.toggleManualSpeed}
							loading={sound.loading}
						/>
					</div>
				</div>
			</div>

			<main className="mx-auto flex min-h-0 w-full max-w-350 flex-1 flex-col p-4">
				{/* Navigation control for screen reader only */}
				<button type="button" className="sr-only focus:not-sr-only self-start" aria-controls="driving-header" aria-expanded={headerVisible} onClick={controls.toggleHeader}>
					{headerVisible ? "Hide driving controls" : "Show driving controls"}
				</button>

				<div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-2">
					<SpeedDisplay
						speed={speed}
						unit={settings.speedUnit}
						gear={gear}
						rpm={rpm}
						idling={ignitionRpm === null && gear === null && rpm === idleRpm}
						maxRpm={settings.maxRpm}
						redZoneRpm={settings.redZoneRpm}
						position={drive.position}
						gpsStatus={drive.status}
						dark={dark}
						showStreetNames={settings.showStreetNames}
						showPointsOfInterest={settings.showPointsOfInterest}
						trip={trip}
						onResetTrip={resetTrip}
					/>
				</div>
			</main>
			<Footer />
		</div>
	)
}
export default App
