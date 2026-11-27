import { Button, Chip, Modal, Surface } from "@heroui/react"
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudOff, CloudRain, CloudRainWind, CloudSnow, CloudSun, Droplets, Moon, Sun, ThermometerSun, Wind, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { GpsFix } from "../hooks/useDrive"
import { weatherUpdateIntervalMinutes } from "../parameters"
import { toDisplaySpeed, type SpeedUnit } from "../speed"
import { SystemMessage } from "./SystemMessage"

function getWeatherIcon(code?: number, isDay?: boolean) {
	if (code === undefined) return CloudOff
	if (code === 0) return isDay ? Sun : Moon
	if (code <= 2) return isDay ? CloudSun : CloudMoon
	if (code === 3) return Cloud
	if (code <= 48) return CloudFog
	if (code <= 57) return CloudDrizzle
	if (code <= 65) return CloudRain
	if (code <= 67) return CloudRainWind
	if (code <= 77) return CloudSnow
	if (code <= 82) return CloudRain
	if (code <= 86) return CloudSnow
	if (code >= 95) return CloudLightning

	return Cloud
}

type Weather = {
	weather_code?: number
	is_day?: number
	temperature_2m?: number
	apparent_temperature?: number
	relative_humidity_2m?: number
	precipitation?: number
	wind_speed_10m?: number
}

type WeatherResponse = { current?: Weather; current_units?: Partial<Record<keyof Weather, string>> }

const weatherDetails = [
	["apparent_temperature", "Feels like", ThermometerSun],
	["relative_humidity_2m", "Humidity", Droplets],
	["precipitation", "Precipitation", CloudRain],
	["wind_speed_10m", "Wind speed", Wind]
] as const

async function getWeather(latitude: number, longitude: number, signal: AbortSignal): Promise<WeatherResponse> {
	const url = new URL("https://api.open-meteo.com/v1/forecast")

	url.search = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation,wind_speed_10m"
	}).toString()

	const response = await fetch(url, { signal })
	if (!response.ok) throw new Error("Weather request failed")
	return response.json()
}

export default function WeatherChip({ position, unit }: { position: GpsFix | null; unit: SpeedUnit }) {
	const [open, setOpen] = useState(false)
	const [data, setData] = useState<WeatherResponse>()
	const [failed, setFailed] = useState(false)
	const coords = useRef(position?.coords)
	const hasPosition = position !== null

	useEffect(() => {
		coords.current = position?.coords
	}, [position])

	useEffect(() => {
		if (!hasPosition) return
		const controller = new AbortController()

		const updateWeather = async () => {
			if (!coords.current) return
			const { latitude, longitude } = coords.current
			try {
				const result = await getWeather(latitude, longitude, controller.signal)
				if (controller.signal.aborted) return
				if (!result.current) throw new Error("Weather data unavailable")
				setData(result)
				setFailed(false)
			} catch {
				if (!controller.signal.aborted) setFailed(true)
			}
		}

		void updateWeather()
		const interval = setInterval(updateWeather, weatherUpdateIntervalMinutes * 60 * 1000)
		return () => {
			clearInterval(interval)
			controller.abort()
		}
	}, [hasPosition])

	const WeatherIcon = getWeatherIcon(data?.current?.weather_code, data?.current?.is_day === 1)

	const formatValue = (key: keyof Weather) => {
		let value = data?.current?.[key]
		if (typeof value !== "number" || !Number.isFinite(value)) return "—"
		let label = data?.current_units?.[key]

		if (unit === "imperial") {
			switch (key) {
				case "temperature_2m":
				case "apparent_temperature":
					value = (value * 9) / 5 + 32
					label = "°F"
					break
				case "wind_speed_10m":
					value = toDisplaySpeed(value, unit)
					label = "mph"
					break
				case "precipitation":
					value /= 25.4
					label = "in"
					break
			}
		}

		return `${value.toLocaleString(undefined, { maximumFractionDigits: key === "precipitation" ? 3 : 1 })}${label ? ` ${label}` : ""}`
	}

	return (
		<>
			<button type="button" aria-haspopup="dialog" aria-label="Show weather details" className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setOpen(true)}>
				<Chip variant="soft" size="lg" className="items-center gap-2 lg:text-xl lg:p-2 lg:font-semibold">
					<WeatherIcon size={15} aria-hidden="true" /> {formatValue("temperature_2m")}
				</Chip>
			</button>
			<Modal.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable variant="blur">
				<Modal.Container placement="center">
					<Modal.Dialog>
						<Modal.Header></Modal.Header>
						<Modal.Header className="flex flex-row items-center justify-between gap-4">
							<Modal.Heading className="title">Current weather</Modal.Heading>
							<Button isIconOnly variant="ghost" onPress={() => setOpen(false)} aria-label="Close performance report">
								<X size={20} />
							</Button>
						</Modal.Header>
						<Modal.Body>
							{data?.current ? (
								<div className="grid grid-cols-2 gap-4">
									<Surface variant="tertiary" className="flex items-center justify-between gap-4 rounded-2xl p-6 col-span-full">
										<div>
											<p className="text-sm text-muted">Outside temperature</p>
											<p className="mt-1 font-display text-5xl leading-none font-semibold tracking-tight tabular-nums">{formatValue("temperature_2m")}</p>
										</div>
										<WeatherIcon size={44} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden="true" />
									</Surface>

									{weatherDetails.map(([key, label, Icon]) => (
										<Surface variant="secondary" key={key} className="min-w-0 p-4 rounded-2xl border border-separator">
											<dt className="flex items-center gap-2 text-sm text-muted">
												<Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
												{label}
											</dt>
											<dd className="mt-1 ps-6 font-semibold tabular-nums">{formatValue(key)}</dd>
										</Surface>
									))}
								</div>
							) : (
								<SystemMessage>{!hasPosition ? "Waiting for GPS location." : failed ? "Weather data is unavailable." : "Loading weather…"}</SystemMessage>
							)}
						</Modal.Body>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</>
	)
}
