import type { ColorValue } from "@heroui/react"
import { Button, ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, Popover } from "@heroui/react"
import { useRef, useState } from "react"

type AccentColorPicker = { color: string; onChange: (color: string) => void }

export function AccentColorPicker(props: AccentColorPicker) {
	const [draft, setDraft] = useState<string | ColorValue>(props.color)
	const draftHex = useRef(props.color)

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			draftHex.current = props.color
			setDraft(props.color)
		} else if (draftHex.current !== props.color) {
			props.onChange(draftHex.current)
		}
	}

	return (
		<Popover onOpenChange={handleOpenChange}>
			<Button variant="secondary" aria-label="Choose accent color" className="w-full lg:w-auto">
				<ColorSwatch color={props.color} size="sm" />
				{props.color.toUpperCase()}
			</Button>
			<Popover.Content placement="bottom right">
				<Popover.Dialog aria-label="Choose accent color">
					<ColorPicker
						value={draft}
						onChange={(value) => {
							draftHex.current = value.toString("hex")
							setDraft(value)
						}}
						className="flex w-56 flex-col gap-3"
					>
						<ColorArea aria-label="Color saturation and brightness" colorSpace="hsb" xChannel="saturation" yChannel="brightness">
							<ColorArea.Thumb />
						</ColorArea>
						<ColorSlider aria-label="Hue" colorSpace="hsb" channel="hue">
							<ColorSlider.Track>
								<ColorSlider.Thumb />
							</ColorSlider.Track>
						</ColorSlider>
						<ColorField aria-label="Hex color">
							<ColorField.Group>
								<ColorField.Input />
							</ColorField.Group>
						</ColorField>
					</ColorPicker>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
