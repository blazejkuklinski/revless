import { Description, Label } from "@heroui/react"
import clsx from "clsx"
import { ReactNode } from "react"

type FieldLabelProps = {
	label: ReactNode
	description?: ReactNode
	className?: string
}

export default function FieldLabel(props: FieldLabelProps) {
	return (
		<div className={clsx("flex flex-col gap-1", props.className)}>
			<Label>{props.label}</Label>
			{props.description && <Description>{props.description}</Description>}
		</div>
	)
}
