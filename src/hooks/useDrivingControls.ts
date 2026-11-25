import { useCallback, useEffect, useState, type MouseEvent } from "react"

export function useDrivingControls(active: boolean) {
	const [manualSpeedOpen, setManualSpeedOpen] = useState(false)
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [gpsOpen, setGpsOpen] = useState(false)
	const [performanceOpen, setPerformanceOpen] = useState(false)
	const [aboutOpen, setAboutOpen] = useState(false)
	const [headerState, setHeaderState] = useState<"hidden" | "revealed" | "temporary">("hidden")

	const overlayOpen = settingsOpen || gpsOpen || performanceOpen || manualSpeedOpen || aboutOpen

	const hideHeader = () => setHeaderState("hidden")
	const toggleHeader = () => setHeaderState((state) => (state === "hidden" ? "revealed" : "hidden"))
	const openPerformance = useCallback(() => setPerformanceOpen(true), [])

	const closeDrawer = (setOpen: (open: boolean) => void) => {
		setOpen(false)
		setHeaderState("temporary")
	}

	const handleScreenClick = ({ target, currentTarget }: MouseEvent<HTMLDivElement>) => {
		if (!active || overlayOpen) return
		if (!(target instanceof Element) || !currentTarget.contains(target)) return
		if (target.closest("#driving-header, a, button, input, select, textarea, label, [contenteditable], [role='button']")) return
		toggleHeader()
	}

	useEffect(() => {
		if (!active || overlayOpen || headerState !== "temporary") return
		const timer = window.setTimeout(() => setHeaderState("hidden"), 5000)
		return () => window.clearTimeout(timer)
	}, [active, overlayOpen, headerState])

	return {
		headerVisible: !active || headerState !== "hidden",
		settingsOpen,
		gpsOpen,
		performanceOpen,
		aboutOpen,
		manualSpeedOpen,

		hideHeader,
		toggleHeader,
		handleScreenClick,

		openSettings: () => setSettingsOpen(true),
		closeSettings: () => closeDrawer(setSettingsOpen),

		openGps: () => setGpsOpen(true),
		closeGps: () => closeDrawer(setGpsOpen),

		openPerformance,
		closePerformance: () => closeDrawer(setPerformanceOpen),
		openAbout: () => setAboutOpen(true),
		closeAbout: () => {
			setAboutOpen(false)
			hideHeader()
		},

		closeManualSpeed: () => closeDrawer(setManualSpeedOpen),
		toggleManualSpeed: () => {
			if (manualSpeedOpen) closeDrawer(setManualSpeedOpen)
			else setManualSpeedOpen(true)
		}
	}
}
