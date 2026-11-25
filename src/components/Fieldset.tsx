import { PropsWithChildren } from "react"

export default function Fieldset(props: PropsWithChildren) {
	return <fieldset className="group flex flex-col gap-4 lg:gap-8">{props.children}</fieldset>
}
