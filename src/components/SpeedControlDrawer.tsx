import { Button, Card, Drawer, InputGroup, Slider } from "@heroui/react"
import { Gauge, X } from "lucide-react"
import { speedUnitLabel, toDisplaySpeed, toKmh, type SpeedUnit } from "../speed"
import FieldLabel from "./FieldLabel"
import { SystemMessage } from "./SystemMessage"

type ManualSpeedControl = {
	open: boolean
	speed: number
	maxSpeed: number
	unit: SpeedUnit
	onChange: (speed: number) => void
	onClose: () => void
}

export function SpeedControlDrawer(props: ManualSpeedControl) {
	const label = speedUnitLabel(props.unit)
	const max = Math.floor(toDisplaySpeed(props.maxSpeed, props.unit) + 1e-9)
	const displaySpeed = Math.min(max, Math.round(toDisplaySpeed(props.speed, props.unit)))
	const change = (value: number) => props.onChange(Math.min(props.maxSpeed, toKmh(Math.max(0, Math.min(max, value || 0)), props.unit)))

	return (
		<Drawer.Backdrop
			isOpen={props.open}
			onOpenChange={(open) => {
				if (!open) props.onClose()
			}}
			variant="transparent"
			isDismissable={false}
		>
			<Drawer.Content placement="left">
				<Drawer.Dialog aria-labelledby="manual-speed-title" className="w-full max-w-150">
					<Drawer.Header className="flex flex-row items-center justify-between gap-2">
						<Drawer.Heading id="manual-speed-title" className="title">
							Speed control
						</Drawer.Heading>
						<Button isIconOnly variant="ghost" onPress={props.onClose} aria-label="Close manual speed controls">
							<X size={20} />
						</Button>
					</Drawer.Header>
					<Drawer.Body className="space-y-6">
						<Card variant="transparent">
							<Card.Header>
								<Card.Title className="flex items-center gap-2">
									<Gauge />
									Speed
								</Card.Title>
							</Card.Header>
							<Card.Content className="p-4 space-y-6">
								<SystemMessage>Simulate a GPS speed while developing locally.</SystemMessage>
								<fieldset>
									<FieldLabel label="Current speed" className="self-center" />
									<InputGroup variant="secondary">
										<InputGroup.Input aria-label={`Manual speed in ${label}`} className="min-w-0 text-right" type="number" min={0} max={max} step={1} value={displaySpeed} onChange={(event) => change(Number(event.target.value))} />
										<InputGroup.Suffix>{label}</InputGroup.Suffix>
									</InputGroup>
									<div className="col-span-2 space-y-2">
										<Slider aria-label={`Adjust manual speed in ${label}`} minValue={0} maxValue={max} step={1} value={displaySpeed} onChange={(value) => change(Array.isArray(value) ? value[0] : value)}>
											<Slider.Track>
												<Slider.Fill />
												<Slider.Thumb />
											</Slider.Track>
										</Slider>
										<div className="flex justify-between text-muted text-xs">
											<span>0 {label}</span>
											<span>
												{max} {label}
											</span>
										</div>
									</div>
								</fieldset>
							</Card.Content>
						</Card>
					</Drawer.Body>
					<Drawer.Footer className="justify-end pt-5">
						<Button onPress={props.onClose}>Done</Button>
					</Drawer.Footer>
				</Drawer.Dialog>
			</Drawer.Content>
		</Drawer.Backdrop>
	)
}
