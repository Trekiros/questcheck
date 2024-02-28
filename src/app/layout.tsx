import NavBar from '@/components/utils/navbar'
import RGPD from '@/components/utils/rgpd'
import { ClerkProvider } from '@clerk/nextjs'
import { FC, ReactNode } from 'react'
import { Toaster } from 'sonner'
import '@/styles/global.scss'

const RootLayout: FC<{ children: ReactNode }> = ({ children }) => {
  	return (
		<ClerkProvider>
			<html lang="en">
				<header>
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
				</header>

				<body>
					<NavBar />
					<main>
						{children}
					</main>
				</body>

				<Toaster />
				<RGPD />
			</html>
		</ClerkProvider>
  	)
}

export default RootLayout