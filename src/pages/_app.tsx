import RGPD from '@/components/utils/rgpd'
import { ClerkProvider } from '@clerk/nextjs'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'
import { trpcClient } from '@/server/utils'
import '../styles/global.scss'
import { DefaultSeo } from 'next-seo'
import { DialogProvider } from '@/components/utils/dialog'
import Image from 'next/image'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord, faGithub, faWordpress, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'

export { reportWebVitals } from 'next-axiom';

const App = ({ Component, pageProps: { session, ...pageProps }}: AppProps) => {
  	return (
		<ClerkProvider>
			<DialogProvider>
				<DefaultSeo
					defaultTitle='Quest Check'
					titleTemplate='%s | Quest Check'
					description='The TTRPG Playtest Bounty Board'
					canonical='https://www.questcheck.org'
					openGraph={{
						description: 'The TTRPG Playtest Bounty Board',
						siteName: 'Quest Check',
					}}
					additionalMetaTags={[
						{ name: "author", content: 'Trekiros' },
						{ name: "keywords", content: "tabletop RPG, TTRPG, D&D, DnD, role playing game, dungeons and dragons, pathfinder" },
					]}
					additionalLinkTags={[
						{ rel: "icon", href: "/ico.ico" },
					]}

				/>

				<Component {...pageProps} />

				<Toaster toastOptions={{ unstyled: true, classNames: { toast: "toast" } }}/>
				<RGPD />

				<footer>
					<div>
						<div className="logo">
							<Image alt="Logo" src="/logo.webp" width={45} height={64} />
							Quest Check
						</div>
						<ul>
							<li><Link href="/about">About</Link></li>
							<li><Link href="/settings">User Profile</Link></li>
							<li><Link href="/privacy">Privacy Policy</Link></li>
							<li><Link href="/tos">Terms of Use</Link></li>
							<li><Link href="/data">Delete my data</Link></li>
						</ul>
						<div>©2024 Trekiros | All Rights Reserved</div>
					</div>

					<div>
						<label className="header">
							LINKS
						</label>
						<div>
							<Link href="https://discord.com/invite/9AJtv5DJ6f" target="_blank">
								<FontAwesomeIcon icon={faDiscord as any} title="Join the Discord server!" />
							</Link>
							<Link href="https://www.youtube.com/@trekiros" target="_blank">
								<FontAwesomeIcon icon={faYoutube as any} title="Follow me on YouTube!" />
							</Link>
							<Link href="https://www.trekiros.com" target="_blank">
								<FontAwesomeIcon icon={faWordpress as any} title="Follow my blog!" />
							</Link>
							<Link href="mailto:trekiros.contact@gmail.com" target="_blank">
								<FontAwesomeIcon icon={faEnvelope} title="Contact through e-mail" />
							</Link>
							<Link href="https://github.com/Trekiros/questcheck" target="_blank">
								<FontAwesomeIcon icon={faGithub} title="Contribute on Github" />
							</Link>
						</div>
					</div>

				</footer>
			</DialogProvider>
		</ClerkProvider>
  	)
}

export default trpcClient.withTRPC(App)