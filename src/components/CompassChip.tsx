import { Chip } from "@heroui/react"
import { CircleArrowUp } from "lucide-react"
import { GpsFix, GpsStatus } from "../hooks/useDrive"

type CompassChipProps = {
	gpsStatus: GpsStatus
	position: GpsFix | null
}

export const compassDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const

export default function CompassChip(props: CompassChipProps) {
	const coords = props.position?.coords
	const heading = coords?.heading
	const bearing = props.gpsStatus === "connected" && typeof heading === "number" && Number.isFinite(heading) && heading >= 0 && heading <= 360 ? heading : null
	const direction = bearing === null ? null : compassDirections[Math.round(bearing / 45) % compassDirections.length]

	return (
		props.gpsStatus === "connected" && (
			<Chip className="gap-2 items-center lg:font-semibold lg:text-xl lg:p-2 " variant="soft" size="lg">
				<CircleArrowUp size={15} role="img" aria-label="North on map" style={{ transform: "rotate(var(--map-north-rotation, 0deg))" }} />
				{direction ?? <span>—</span>}
			</Chip>
		)
	)
}
