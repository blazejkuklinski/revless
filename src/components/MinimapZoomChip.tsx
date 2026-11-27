import { Chip } from "@heroui/react"
import { SearchSlash } from "lucide-react"
import { GpsFix } from "../hooks/useDrive"
import { mapZoom } from "../parameters"
import { useSettingsStore } from "../stores/settingsStore"

type MinimapZoomChipProps = {
	position: GpsFix | null
}

export default function MinimapZoomChip(props: MinimapZoomChipProps) {
	const coords = props.position?.coords
	const setMapZoom = useSettingsStore((state) => state.setMapZoom)
	const hasCustomZoom = useSettingsStore((state) => state.settings.mapZoom !== mapZoom)
	const hasPosition = !!coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)

	return (
		hasPosition &&
		hasCustomZoom && (
			<Chip variant="soft" color="warning" size="lg" className="cursor-pointer items-center gap-2 lg:text-xl lg:p-2 lg:font-semibold" aria-label="Reset map zoom" onClick={() => setMapZoom(mapZoom)}>
				<SearchSlash size={15} aria-hidden="true" /> Reset
			</Chip>
		)
	)
}
