import { Circle } from "lucide-react"
import { version } from "../../package.json"

export function Footer() {
	return (
		<footer className="w-full shrink-0 bg-surface px-2 py-1 h-sm:py-2">
			<div className="mx-auto flex w-full max-w-350 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
				<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
					&copy; OpenStreetMap
				</a>
				<Circle size={5} className="fill-muted" />
				<a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">
					&copy; OpenMapTiles
				</a>
				<Circle size={5} className="fill-muted" />
				<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
					Weather data by Open-Meteo
				</a>
				<Circle size={5} className="fill-muted" />
				<a href="https://zerogravity.solutions" target="_blank" rel="noreferrer" className="font-bold">
					&copy; ZeroGravity
				</a>
				<Circle size={5} className="fill-muted" />
				<span>v{version}</span>
			</div>
		</footer>
	)
}
