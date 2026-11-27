import { Chip } from "@heroui/react"
import { SatelliteIcon } from "lucide-react"

type GpsStatusChipProps = {
	gpsStatus: string
}

export default function GpsStatusChip(props: GpsStatusChipProps) {
	return (
		<Chip className="gap-2 lg:font-semibold lg:text-xl lg:p-2" variant="soft" color={props.gpsStatus === "connected" ? "success" : "warning"} size="lg">
			<SatelliteIcon size={15} />
			{props.gpsStatus === "connected" ? "GPS" : props.gpsStatus === "error" ? "GPS unavailable" : "Finding GPS"}
		</Chip>
	)
}
