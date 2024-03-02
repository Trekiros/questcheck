import NavBar from '@/components/utils/navbar'
import RGPD from '@/components/utils/rgpd'
import { ClerkProvider } from '@clerk/nextjs'
import type { AppProps, AppType } from 'next/app'
import { Toaster } from 'sonner'
import { trpcClient } from '@/server/utils'
import '../styles/global.scss'
import { Helmet } from 'react-helmet'

export { reportWebVitals } from 'next-axiom';

const App: AppType = ({ Component, pageProps: { session, ...pageProps } }: AppProps) => {
  	return (
		<ClerkProvider>
			<Helmet>
				<meta name="title" content="Quest Check" />
				<meta name="description" content="The TTRPG Playtest Bounty Board" />
				<meta name="og:title" content="Quest Check" />
				<meta name="og:type" content="Website" />
				<meta name="og:siteName" content="Quest Check" />
				<meta name="og:description" content="The TTRPG Playtest Bounty Board" />
				<meta name="keywords" content="tabletop RPG, TTRPG, D&D, DnD, role playing game, dungeons and dragons, pathfinder" />
				<meta name="author" content="Trekiros" />
				<meta charSet="UTF-8" />
				<link rel="icon" href="/ico.ico" />
			</Helmet>

			<NavBar />
			<main>
				<Component {...pageProps} />
			</main>

			<Toaster />
			<RGPD />
		</ClerkProvider>
  	)
}

export default trpcClient.withTRPC(App)