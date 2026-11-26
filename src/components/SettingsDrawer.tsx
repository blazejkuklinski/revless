import { Button, ButtonGroup, Card, Drawer, InputGroup, Label, Radio, RadioGroup, Slider, Switch, Tabs } from "@heroui/react"
import clsx from "clsx"
import { Cog, Engine, Map, Monitor, Moon, Sun, Volume2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { isEngineSound } from "../hooks/useEngineSound"
import { engineSamples, engineSounds, shiftPresets, type ShiftPreset } from "../parameters"
import { speedUnitLabel, toDisplaySpeed, toKmh, type SpeedUnit } from "../speed"
import { useSettingsStore } from "../stores/settingsStore"
import { AccentColorPicker } from "./AccentColorPicker"
import Field from "./Field"
import Fieldset from "./Fieldset"

// Aligns each section icon with its title.
const titleClass = "flex items-center gap-2 text-sm font-bold"

type MaxSpeedInput = {
	value: number
	minSpeed: number
	unit: SpeedUnit
	onChange: (value: number) => void
}

function MaxSpeedInput(props: MaxSpeedInput) {
	const [draft, setDraft] = useState(() => String(Math.round(toDisplaySpeed(props.value, props.unit))))
	useEffect(() => setDraft(String(Math.round(toDisplaySpeed(props.value, props.unit)))), [props.value, props.unit])
	const commit = () => {
		const parsed = Number(draft)
		if (draft.trim() && Number.isFinite(parsed)) {
			const next = Math.min(500, Math.max(props.minSpeed, toKmh(parsed, props.unit)))
			props.onChange(next)
			setDraft(String(Math.round(toDisplaySpeed(next, props.unit))))
		} else setDraft(String(Math.round(toDisplaySpeed(props.value, props.unit))))
	}
	return (
		<InputGroup variant="secondary" role="presentation" className="w-full @lg:max-w-50">
			<InputGroup.Input
				aria-label={`Maximum speed in ${speedUnitLabel(props.unit)}`}
				type="number"
				min={Math.ceil(toDisplaySpeed(props.minSpeed, props.unit))}
				max={Math.floor(toDisplaySpeed(500, props.unit))}
				step="1"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === "Enter") event.currentTarget.blur()
				}}
			/>
			<InputGroup.Suffix aria-hidden="true">{speedUnitLabel(props.unit)}</InputGroup.Suffix>
		</InputGroup>
	)
}

type RpmInput = { label: string; value: number; min: number; max: number; step: number; onChange: (rpm: number) => void }

function RpmInput(props: RpmInput) {
	const [draft, setDraft] = useState(String(props.value))
	useEffect(() => setDraft(String(props.value)), [props.value])
	const commit = () => {
		const parsed = Number(draft)
		if (draft.trim() && Number.isFinite(parsed)) {
			const next = Math.max(props.min, Math.min(props.max, Math.round(parsed)))
			props.onChange(next)
			setDraft(String(next))
		} else setDraft(String(props.value))
	}
	return (
		<InputGroup variant="secondary" className="w-full @lg:max-w-50">
			<InputGroup.Input
				aria-label={props.label}
				type="number"
				min={props.min}
				max={props.max}
				step={props.step}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === "Enter") event.currentTarget.blur()
				}}
			/>
			<InputGroup.Suffix aria-hidden="true">RPM</InputGroup.Suffix>
		</InputGroup>
	)
}

type GearsProps = {
	value: number
	min: number
	max: number
	onChange: (gear: number) => void
}

function GearsInput(props: GearsProps) {
	return (
		<InputGroup variant="secondary" className="w-full @lg:max-w-50">
			<InputGroup.Input aria-label="Number of gears" type="number" min={props.min} max={props.max} value={props.value} onChange={(event) => props.onChange(Number(event.target.value))} />
			<InputGroup.Suffix>
				<Engine />
			</InputGroup.Suffix>
		</InputGroup>
	)
}

type SettingsDrawer = {
	open: boolean
	placement: "left" | "right"
	onClose: () => void
}

export function SettingsDrawer(props: SettingsDrawer) {
	const { settings, resetSettings, setMaxSpeed, setShiftPreset, setSpeedUnit, setMaxRpm, setRedZoneRpm, setGears, setTheme, setShowStreetNames, setShowPointsOfInterest, setAccentColor, setSound, setVolume } = useSettingsStore()
	const { maxSpeed, shiftPreset, speedUnit, maxRpm, redZoneRpm, gears, theme, showStreetNames, showPointsOfInterest, accentColor, sound, volume } = settings

	return (
		<Drawer.Backdrop
			isOpen={props.open}
			onOpenChange={(isOpen) => {
				if (!isOpen) props.onClose()
			}}
			isDismissable
			variant="blur"
		>
			<Drawer.Content placement={props.placement}>
				<Drawer.Dialog aria-labelledby="settings-title" className="w-full max-w-200">
					<Drawer.Header className="flex flex-row items-center justify-between gap-4">
						<Drawer.Heading id="settings-title" className="title">
							Settings
						</Drawer.Heading>
						<Button isIconOnly variant="ghost" onPress={props.onClose} aria-label="Close settings">
							<X size={20} />
						</Button>
					</Drawer.Header>
					<Drawer.Body className="overflow-y-shadow pr-4">
						<Tabs defaultSelectedKey="sound">
							<Tabs.ListContainer>
								<Tabs.List aria-label="Settings categories" className="w-full">
									<Tabs.Tab id="sound" className="flex-1">
										Sound
										<Tabs.Indicator />
									</Tabs.Tab>
									<Tabs.Tab id="gears" className="flex-1">
										Gears
										<Tabs.Indicator />
									</Tabs.Tab>

									<Tabs.Tab id="appearance" className="flex-1">
										Display
										<Tabs.Indicator />
									</Tabs.Tab>
								</Tabs.List>
							</Tabs.ListContainer>

							<Tabs.Panel id="sound">
								<Card variant="transparent">
									<Card.Header>
										<Card.Title className="flex items-center gap-2 text-sm font-bold">
											<Volume2 />
											Sound
										</Card.Title>
									</Card.Header>
									<Card.Content className="space-y-6">
										<Fieldset>
											<Field>
												<Field.Label label="Engine sound" />
												<Field.Control>
													<RadioGroup
														aria-label="Engine sound"
														name="engine-sound"
														orientation="horizontal"
														value={sound}
														onChange={(value) => {
															if (isEngineSound(value)) setSound(value)
														}}
														className="w-full grid grid-cols-2 gap-2"
														variant="primary"
													>
														{([...engineSounds, "off"] as const).map((value) => (
															<Radio key={value} value={value} className="flex-1">
																<Radio.Content className={clsx("flex w-full items-center gap-2 rounded-2xl bg-surface-hover border p-4", sound === value ? "border-accent" : "border-separator")}>
																	<Radio.Control>
																		<Radio.Indicator />
																	</Radio.Control>
																	<span className="text-sm font-semibold truncate">{value === "off" ? "Off" : engineSamples[value].label}</span>
																</Radio.Content>
															</Radio>
														))}
													</RadioGroup>
												</Field.Control>
											</Field>

											<div className="space-y-2">
												<Slider aria-label="Master volume" minValue={0} maxValue={100} value={volume} isDisabled={sound === "off"} onChange={(value) => setVolume(Array.isArray(value) ? value[0] : value)} className="gap-2">
													<Label>Master volume</Label>
													<Slider.Track>
														<Slider.Fill />
														<Slider.Thumb />
													</Slider.Track>
													<Slider.Output>{volume}%</Slider.Output>
												</Slider>
												<div className="flex justify-between text-xs font-bold tracking-wider text-muted">
													<span>QUIET</span>
													<span>LOUD</span>
												</div>
											</div>
										</Fieldset>
									</Card.Content>
								</Card>
							</Tabs.Panel>

							<Tabs.Panel id="gears">
								<Card variant="transparent">
									<Card.Header>
										<Card.Title className={titleClass}>
											<Cog />
											Transmission
										</Card.Title>
									</Card.Header>
									<Card.Content>
										<Fieldset>
											<Field>
												<Field.Label label="Gears" description="Number of forward gears" />
												<Field.Control>
													<GearsInput value={gears} min={4} max={12} onChange={setGears} />
												</Field.Control>
											</Field>

											<Field>
												<Field.Label label="Top speed" description="Road speed at maximum RPM in top gear" />
												<Field.Control>
													<MaxSpeedInput value={maxSpeed} minSpeed={30} unit={speedUnit} onChange={setMaxSpeed} />
												</Field.Control>
											</Field>

											<Field>
												<Field.Label label="Maximum RPM" description="Engine speed limit" />
												<Field.Control>
													<RpmInput label="Maximum RPM" value={maxRpm} min={2000} max={20000} step={500} onChange={setMaxRpm} />
												</Field.Control>
											</Field>

											<Field>
												<Field.Label label="Redline RPM" description="Start of the red zone and reference for shift timing" />
												<Field.Control>
													<RpmInput label="Redline RPM" value={redZoneRpm} min={1000} max={maxRpm - 1} step={100} onChange={setRedZoneRpm} />
												</Field.Control>
											</Field>

											<Field>
												<Field.Label label="Shift preset" description="Controls how long the engine holds each gear" />
												<Field.Control className="lg:col-span-1">
													<ButtonGroup aria-label="Shift preset" fullWidth>
														{(Object.keys(shiftPresets) as ShiftPreset[]).map((preset) => (
															<Button key={preset} className="capitalize" variant={shiftPreset === preset ? "secondary" : "tertiary"} onPress={() => setShiftPreset(preset)} aria-pressed={shiftPreset === preset}>
																{preset}
															</Button>
														))}
													</ButtonGroup>
												</Field.Control>
											</Field>
										</Fieldset>
									</Card.Content>
								</Card>
							</Tabs.Panel>

							<Tabs.Panel id="appearance" className="space-y-6">
								<Card variant="transparent">
									<Card.Header>
										<Card.Title className="flex items-center gap-2 text-sm font-bold">
											<Sun />
											Appearance
										</Card.Title>
									</Card.Header>
									<Card.Content className="overflow-y-shadow">
										<Fieldset>
											<Field>
												<Field.Label label="Speed units" description="Display and controls" />
												<Field.Control>
													<ButtonGroup aria-label="Speed units" fullWidth>
														{(
															[
																["metric", "km/h"],
																["imperial", "mph"]
															] as const
														).map(([value, label]) => (
															<Button key={value} variant={speedUnit === value ? "secondary" : "tertiary"} onPress={() => setSpeedUnit(value)} aria-pressed={speedUnit === value}>
																{label}
															</Button>
														))}
													</ButtonGroup>
												</Field.Control>
											</Field>

											<Field>
												<Field.Label label="Appearance" description="Application theme" />
												<Field.Control>
													<ButtonGroup fullWidth aria-label="Appearance" className="col-span-full">
														{(
															[
																["system", Monitor, "Auto"],
																["light", Sun, "Light"],
																["dark", Moon, "Dark"]
															] as const
														).map(([value, Icon, label]) => (
															<Button key={value} variant={theme === value ? "secondary" : "tertiary"} onPress={() => setTheme(value)} aria-pressed={theme === value}>
																<Icon />
																{label}
															</Button>
														))}
													</ButtonGroup>
												</Field.Control>
											</Field>

											<Field>
												<Field.Label label="Accent color" description="Main accent color to match car UI" />
												<Field.Control>
													<AccentColorPicker color={accentColor} onChange={setAccentColor} />
												</Field.Control>
											</Field>
										</Fieldset>
									</Card.Content>
								</Card>

								<Card variant="transparent">
									<Card.Header>
										<Card.Title className="flex items-center gap-2 text-sm font-bold">
											<Map />
											Map
										</Card.Title>
									</Card.Header>
									<Card.Content>
										<Fieldset>
											<Field className="grid-cols-2 items-center">
												<Field.Label label="Street names" description="Show street names on the minimap" />
												<Field.Control className="justify-end">
													<Switch isSelected={showStreetNames} onChange={setShowStreetNames}>
														<Switch.Content aria-label="Street names">
															<Switch.Control>
																<Switch.Thumb />
															</Switch.Control>
														</Switch.Content>
													</Switch>
												</Field.Control>
											</Field>

											<Field className="grid-cols-2 items-center">
												<Field.Label label="Points of interest" description="Show named places on the minimap" />
												<Field.Control className="justify-end">
													<Switch isSelected={showPointsOfInterest} onChange={setShowPointsOfInterest}>
														<Switch.Content aria-label="Points of interest">
															<Switch.Control>
																<Switch.Thumb />
															</Switch.Control>
														</Switch.Content>
													</Switch>
												</Field.Control>
											</Field>
										</Fieldset>
									</Card.Content>
								</Card>
							</Tabs.Panel>
						</Tabs>
					</Drawer.Body>
					<Drawer.Footer className="justify-end">
						<Button variant="secondary" onPress={resetSettings} size="lg">
							Reset settings
						</Button>
						<Button onPress={props.onClose} size="lg">
							Done
						</Button>
					</Drawer.Footer>
				</Drawer.Dialog>
			</Drawer.Content>
		</Drawer.Backdrop>
	)
}
