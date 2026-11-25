import { Chip, ChipVariants } from "@heroui/react"
import { Lightbulb, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type SystemMessage = {
	children: ReactNode
	icon?: LucideIcon
	variant?: ChipVariants["variant"]
	color?: ChipVariants["color"]
}

export function SystemMessage(props: SystemMessage) {
	const Icon = props.icon ?? Lightbulb

	return (
		<Chip variant={props.variant ?? "soft"} color={props.color ?? "default"} className="w-full max-w-full items-start gap-2 p-2 text-left whitespace-normal">
			<Icon size={16} className="shrink-0" aria-hidden="true" />
			<Chip.Label className="min-w-0 whitespace-normal leading-relaxed">{props.children}</Chip.Label>
		</Chip>
	)
}
