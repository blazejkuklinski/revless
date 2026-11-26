import { Button, ButtonGroup, Dropdown, Separator } from "@heroui/react"
import clsx from "clsx"
import { ChevronDown, CircleGauge, Info, Power, SlidersHorizontal, Timer, Toolbox, Wrench } from "lucide-react"

type Header = {
	rightHandDrive: boolean
	active: boolean
	manual: boolean
	loading: boolean
	onToggleManualSpeed: () => void
	onToggle: () => void
	onOpenSettings: () => void
	onOpenPerformance: () => void
	onOpenGps: () => void
	onOpenAbout: () => void
}

export function Header(props: Header) {
	return (
		<header className={clsx("flex shrink-0 items-center justify-between border-b border-separator bg-surface p-2 h-sm:p-4 lg:p-6", props.rightHandDrive && "flex-row-reverse")}>
			<ButtonGroup size="lg" aria-label="Driving controls">
				<Dropdown>
					<Button size="lg" isIconOnly variant={props.active ? "secondary" : "primary"} aria-label="More driving controls">
						<ChevronDown size={20} />
					</Button>
					<Dropdown.Popover placement="bottom end">
						<Dropdown.Menu aria-label="More driving controls">
							{props.manual && (
								<Dropdown.Item id="manual-speed" onAction={props.onToggleManualSpeed} className="p-3">
									<Wrench size={15} />
									Manual speed controls
								</Dropdown.Item>
							)}
							<Dropdown.Item id="settings" onAction={props.onOpenSettings} className="p-3">
								<SlidersHorizontal size={15} />
								Settings
							</Dropdown.Item>
							<Dropdown.Item id="performance" onAction={props.onOpenPerformance} className="p-3">
								<Timer size={15} />
								Performance report
							</Dropdown.Item>
							<Dropdown.Item id="gps" onAction={props.onOpenGps} className="p-3">
								<Toolbox size={15} />
								Diagnostics
							</Dropdown.Item>
							<Separator />

							<Dropdown.Item id="about" onAction={props.onOpenAbout} className="p-3">
								<Info size={15} />
								About
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
				<Button variant={props.active ? "secondary" : "primary"} onPress={props.onToggle} isDisabled={props.loading} className="sm:w-50">
					<Power size={20} />
					{props.loading ? "Loading sound..." : props.active ? "End drive" : "Start driving"}
				</Button>
			</ButtonGroup>
			<div className="flex items-center gap-3 font-display text-lg font-extrabold tracking-tight">
				<CircleGauge size={20} />
				<span className="min-w-0 truncate">
					<span className="text-accent">Rev</span>
					<span className="font-semibold">less</span>
				</span>
			</div>
		</header>
	)
}
