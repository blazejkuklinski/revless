import { create } from "zustand"
import { performanceResultsStorageKey } from "../parameters"
import type { PerformanceMode, PerformanceRun } from "../performance"

export type PerformanceResult = Pick<PerformanceRun, "elapsedMs" | "finishSpeed" | "distanceMetres" | "unit"> & { slopePercent?: number | null }

type ModeResults = {
	last: PerformanceResult | null
	best: PerformanceResult | null
}

type PerformanceResults = Partial<Record<PerformanceMode, ModeResults>>

type PerformanceResultsStore = {
	results: PerformanceResults
	recordResult: (run: PerformanceRun) => void
	resetResult: (mode: PerformanceMode, slot: keyof ModeResults) => void
}

function loadResults(): PerformanceResults {
	try {
		return JSON.parse(localStorage.getItem(performanceResultsStorageKey) ?? "null") ?? {}
	} catch {
		return {}
	}
}

export const usePerformanceResultsStore = create<PerformanceResultsStore>((set) => ({
	results: loadResults(),
	recordResult: ({ phase, mode, elapsedMs, finishSpeed, distanceMetres, unit, slopePercent }) => {
		if (phase !== "complete") return
		const last = { elapsedMs, finishSpeed, distanceMetres, unit, slopePercent }
		set(({ results }) => {
			const best = results[mode]?.best
			return { results: { ...results, [mode]: { last, best: best && best.elapsedMs <= elapsedMs ? best : last } } }
		})
	},
	resetResult: (mode, slot) =>
		set((state) => {
			const modeResults = state.results[mode]
			if (!modeResults?.[slot]) return state
			return { results: { ...state.results, [mode]: { ...modeResults, [slot]: null } } }
		})
}))

usePerformanceResultsStore.subscribe(({ results }) => {
	try {
		localStorage.setItem(performanceResultsStorageKey, JSON.stringify(results))
	} catch {
		// Results remain available in memory if the browser denies storage access.
	}
})
