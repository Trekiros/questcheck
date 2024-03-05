import NavBar from '@/components/utils/navbar'
import RGPD from '@/components/utils/rgpd'
import { ClerkProvider } from '@clerk/nextjs'
import type { AppProps, AppType } from 'next/app'
import { Toaster } from 'sonner'
import { trpcClient } from '@/server/utils'
import '../styles/global.scss'
import { DefaultSeo } from 'next-seo'
import { DialogProvider } from '@/components/utils/dialog'

export { reportWebVitals } from 'next-axiom';

const App: AppType = ({ Component, pageProps: { session, ...pageProps } }: AppProps) => {
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

				<NavBar />
				<main>
					<Component {...pageProps} />
				</main>

				<Toaster toastOptions={{ unstyled: true, classNames: { toast: "toast" } }}/>
				<RGPD />
			</DialogProvider>
		</ClerkProvider>
  	)
}

export default trpcClient.withTRPC(App)