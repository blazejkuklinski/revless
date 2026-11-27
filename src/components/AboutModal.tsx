import { Button, Modal, Surface } from "@heroui/react"
import { ExternalLink, X } from "lucide-react"
import { sponsorLinks } from "../parameters"

type AboutModalProps = {
	open: boolean
	onClose: () => void
}
export function AboutModal(props: AboutModalProps) {
	return (
		<Modal.Backdrop
			isOpen={props.open}
			onOpenChange={(isOpen) => {
				if (!isOpen) props.onClose()
			}}
			isDismissable
			variant="blur"
		>
			<Modal.Container placement="center">
				<Modal.Dialog className="max-w-350">
					<Modal.Header className="flex flex-row items-center justify-between gap-4">
						<Modal.Heading className="title">About Revless</Modal.Heading>
						<Button isIconOnly variant="ghost" onPress={props.onClose}>
							<X size={20} />
						</Button>
					</Modal.Header>
					<Modal.Body className="space-y-2 md:space-y-6 overflow-y-shadow after:-bottom-0.75!">
						<p>
							<b className="text-accent">Revless</b> is for petrolheads who went electric and still miss a good old engine growl. It turns GPS speed into revs, rumbles, and gear changes, because even the smoothest ride can use a little
							drama.
						</p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-6">
							<Surface className="space-y-4 p-4 rounded" variant="secondary">
								<h3 className="font-semibold">How to use Revless</h3>
								<ul className="list-disc space-y-2 pl-5">
									<li>Open Revless in your vehicle's browser if it supports location access and audio playback.</li>
									<li>To use your phone, pair it with your car over Bluetooth, select Bluetooth audio as the car's media source, and open Revless in your phone's browser.</li>
								</ul>
								<p>
									Allow location access when prompted to track GPS speed and trip stats. Tap <strong>Ignite</strong> to hear engine sounds through your selected audio output as you drive.
								</p>
							</Surface>

							<Surface className="space-y-4 p-4 rounded" variant="secondary">
								<h3 className="font-semibold">Enjoying this app?</h3>
								<p> You can support my work by buying me a coffee or using my referral link when you order a Tesla. Thanks for taking it for a spin!</p>

								<div className="flex flex-wrap justify-center items-center gap-4">
									{sponsorLinks.map(({ label, href, qr }) => (
										<a
											key={href}
											href={href}
											target="_blank"
											rel="noreferrer"
											className="flex min-w-0 flex-col items-center gap-3 rounded-lg border border-separator bg-surface p-2 text-center text-sm font-semibold hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
										>
											<img src={qr} alt="" className="aspect-square w-30 rounded bg-white p-2" />
											<span className="flex items-center justify-center gap-2">
												{label}
												<ExternalLink size={14} className="shrink-0" aria-hidden="true" />
											</span>
										</a>
									))}
								</div>
							</Surface>
						</div>
					</Modal.Body>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
