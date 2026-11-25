import clsx from "clsx"
import type { PropsWithChildren } from "react"
import FieldLabel from "./FieldLabel"

type FieldRootProps = {
	className?: string
} & PropsWithChildren

function FieldRoot(props: FieldRootProps) {
	return <div className={clsx("grid grid-cols-1 lg:grid-cols-2 gap-4", props.className)}>{props.children}</div>
}

type FieldControlProps = {
	className?: string
} & PropsWithChildren

function FieldControl(props: FieldControlProps) {
	return <div className={clsx("shrink-0 flex lg:justify-end", props.className)}>{props.children}</div>
}

export default Object.assign(FieldRoot, {
	Label: FieldLabel,
	Control: FieldControl
})
