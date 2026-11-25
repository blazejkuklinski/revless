import { toast } from "@heroui/react"
import { Circle } from "lucide-react"
import { useEffect, useRef } from "react"

const title = "Performance test activated"

type PerformanceStatusToastProps = {
	startedAt: number | null
	onOpen: () => void
}

export function PerformanceStatusToast(props: PerformanceStatusToastProps) {
	const toastId = useRef<string | null>(null)
	const { onOpen, startedAt } = props

	useEffect(() => {
		const id = toast.info(title, {
			description: "The timer starts when you move.",
			indicator: <Circle className="fill-danger animate-pulse" size={15} />,
			timeout: 0,
			onClose: () => {
				if (toastId.current === id) toastId.current = null
			},
			actionProps: { children: "Open", onPress: onOpen }
		})
		toastId.current = id
		return () => toast.close(id)
	}, [onOpen])

	useEffect(() => {
		if (startedAt === null) return

		const updateTimer = () => {
			if (toastId.current === null) return
			const elapsedSeconds = Math.max(0, Date.now() - startedAt) / 1000
			toast.update(toastId.current, title, {
				indicator: <Circle className="fill-success animate-pulse" size={15} />,
				description: `${elapsedSeconds.toFixed(2)} s`,
				variant: "accent",
				actionProps: { children: "Open", onPress: onOpen }
			})
		}
		updateTimer()
		const timer = window.setInterval(updateTimer, 50)
		return () => window.clearInterval(timer)
	}, [startedAt, onOpen])

	return null
}
