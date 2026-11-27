import { toast } from "@heroui/react"
import { useEffect, useRef, useState } from "react"
import {
	enginePitchLinearWeight,
	engineSamples,
	engineSounds,
	engineStartupSample,
	engineVolumePeakRpm,
	idleRpm,
	idleVolume,
	loopCrossfadeSeconds,
	maxEnginePlaybackRate,
	minEnginePlaybackRate,
	startupCrossfadeSeconds,
	startupOutputGain,
	type EngineSound
} from "../parameters"

type RecordedSound = (typeof engineSounds)[number]
type Voice = { name: RecordedSound; source: AudioBufferSourceNode; gain: GainNode }
type Engine = { context: AudioContext; master: GainNode; startupGain: GainNode; voices: Voice[] }

function crossfadeLoop(context: AudioContext, buffer: AudioBuffer) {
	const overlap = Math.min(Math.round(loopCrossfadeSeconds * buffer.sampleRate), Math.floor(buffer.length / 4))
	if (overlap < 2) return buffer

	const tailStart = buffer.length - overlap
	const loop = context.createBuffer(buffer.numberOfChannels, tailStart, buffer.sampleRate)
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
		const samples = buffer.getChannelData(channel)
		const output = loop.getChannelData(channel)
		output.set(samples.subarray(overlap, tailStart), overlap)

		// Begin with the tail so the native loop wraps between adjacent original samples.
		for (let frame = 0; frame < overlap; frame++) {
			const mix = frame / (overlap - 1)
			output[frame] = samples[tailStart + frame] * (1 - mix) + samples[frame] * mix
		}
	}
	return loop
}

function rpmProgress(rpm: number, targetRpm: number) {
	return Math.max(0, Math.min(1, (rpm - idleRpm) / Math.max(1, targetRpm - idleRpm)))
}

function playbackRateForProgress(progress: number) {
	const pitchProgress = enginePitchLinearWeight * progress + (1 - enginePitchLinearWeight) * progress ** 2
	return minEnginePlaybackRate + (maxEnginePlaybackRate - minEnginePlaybackRate) * pitchProgress
}

function updateEngine(engine: Engine, rpm: number, maxRpm: number, volume: number, sound: EngineSound) {
	const now = engine.context.currentTime
	const playbackRate = playbackRateForProgress(rpmProgress(rpm, maxRpm))
	for (const voice of engine.voices) {
		voice.source.playbackRate.setTargetAtTime(playbackRate, now, 0.075)
		voice.gain.gain.setTargetAtTime(voice.name === sound ? 1 : 0, now, 0.08)
	}
	const rpmVolume = idleVolume + (1 - idleVolume) * rpmProgress(rpm, engineVolumePeakRpm)
	const masterVolume = volume / 100
	engine.master.gain.setTargetAtTime(masterVolume * rpmVolume, now, 0.12)
	engine.startupGain.gain.setTargetAtTime(sound === "off" ? 0 : masterVolume * startupOutputGain, now, 0.08)
}

export function isEngineSound(value: unknown): value is EngineSound {
	return value === "off" || (typeof value === "string" && Object.hasOwn(engineSamples, value))
}

const maxStartupSpeedKmh = 5

export function useEngineSound(rpm: number, maxRpm: number, volume: number, sound: EngineSound, speed: number) {
	const engine = useRef<Engine | null>(null)
	const generation = useRef(0)
	const currentValues = useRef({ rpm, maxRpm, volume, sound, speed })
	currentValues.current = { rpm, maxRpm, volume, sound, speed }
	const [loading, setLoading] = useState(false)

	const start = async (onIgnition: () => void) => {
		const token = ++generation.current
		setLoading(true)
		let context: AudioContext | null = null
		try {
			const audioContext = new AudioContext()
			context = audioContext
			// Resume immediately inside the user gesture, before fetching or decoding.
			await audioContext.resume()

			const loadSample = async (url: string) => {
				const response = await fetch(url)
				if (!response.ok) throw new Error("Engine sound could not be loaded")
				return audioContext.decodeAudioData(await response.arrayBuffer())
			}

			const [startupBuffer, recordings] = await Promise.all([
				speed <= maxStartupSpeedKmh ? loadSample(engineStartupSample) : null,
				Promise.all(
					engineSounds.map(async (name) => ({
						name,
						buffer: await loadSample(engineSamples[name].url)
					}))
				)
			])

			if (token !== generation.current) {
				await audioContext.close()
				return false
			}

			const master = audioContext.createGain()
			const loopFade = audioContext.createGain()
			const compressor = audioContext.createDynamicsCompressor()

			master.gain.value = 0
			compressor.threshold.value = -8
			compressor.ratio.value = 4

			master.connect(loopFade)
			loopFade.connect(compressor)
			compressor.connect(audioContext.destination)

			const voices: Voice[] = recordings.map(({ name, buffer }) => {
				const source = audioContext.createBufferSource()
				source.buffer = crossfadeLoop(audioContext, buffer)
				source.loop = true
				source.playbackRate.value = playbackRateForProgress(rpmProgress(currentValues.current.rpm, currentValues.current.maxRpm))
				const gain = audioContext.createGain()
				gain.gain.value = 0
				source.connect(gain)
				gain.connect(master)
				return { name, source, gain }
			})

			const startupSource = audioContext.createBufferSource()
			const startupGain = audioContext.createGain()
			const startupFade = audioContext.createGain()
			const { sound, volume } = currentValues.current

			startupSource.buffer = startupBuffer
			startupGain.gain.value = sound === "off" ? 0 : (volume / 100) * startupOutputGain

			startupSource.connect(startupGain)
			startupGain.connect(startupFade)
			startupFade.connect(compressor)

			engine.current = { context: audioContext, master, startupGain, voices }

			updateEngine(engine.current, currentValues.current.rpm, currentValues.current.maxRpm, currentValues.current.volume, currentValues.current.sound)

			const startTime = audioContext.currentTime
			let loopStart = startTime
			if (startupBuffer && currentValues.current.speed <= maxStartupSpeedKmh) {
				const startupEnd = startTime + startupBuffer.duration
				const overlap = Math.min(startupCrossfadeSeconds, startupBuffer.duration)
				loopStart = startupEnd - overlap

				startupFade.gain.setValueAtTime(1, loopStart)
				startupFade.gain.linearRampToValueAtTime(0, startupEnd)
				loopFade.gain.setValueAtTime(0, startTime)
				loopFade.gain.setValueAtTime(0, loopStart)
				loopFade.gain.linearRampToValueAtTime(1, startupEnd)
				startupSource.start(startTime)
				if (sound !== "off" && volume > 0) onIgnition()
			}
			for (const { source } of voices) source.start(loopStart)
			return true
		} catch {
			if (context && context.state !== "closed") {
				await context.close().catch(() => {})
			}
			if (token === generation.current) {
				toast.danger("Engine sound could not be loaded. Please try again.", { timeout: 0 })
			}
			return false
		} finally {
			if (token === generation.current) setLoading(false)
		}
	}

	const stop = () => {
		generation.current++
		setLoading(false)
		const current = engine.current
		engine.current = null
		if (current) {
			void current.context.close()
		}
	}

	useEffect(() => {
		if (engine.current) {
			updateEngine(engine.current, rpm, maxRpm, volume, sound)
		}
	}, [rpm, maxRpm, volume, sound])

	useEffect(
		() => () => {
			generation.current++
			if (engine.current) {
				void engine.current.context.close()
			}
		},
		[]
	)

	return { start, stop, loading }
}
