import { FC, Suspense } from "react";
import styles from './navbar.module.scss'
import { UserButton, auth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { getUser } from "@/server/cache/users";
import { ClerkTheme } from "@/app/sign-in/[[...index]]";
import TextSkeleton from "../skeleton/text";

const NavBarActions: FC<{}> = async ({}) => {
	const user = await getUser()

	return (
		<div className={styles.actions}>
			{ user ? <>
				<Link href='/settings'>{user.userName}</Link>
				<UserButton appearance={ClerkTheme} />
			</> : <>
				<Link href="/sign-in">Sign In</Link>
				<Link href="/sign-up">Sign Up</Link>
			</>}
		</div>
	)
}

const NavBar: FC<{}> = async ({}) => {

    return (
        <nav className={styles.topNav}>
			<Link href="/" className={styles.logo}>
				<Image alt="Logo" src="/logo.webp" width={45} height={64} />
				Quest Check
			</Link>

			<Suspense fallback={<TextSkeleton lines={1} style={{ width: "100px" }} />}>
				<NavBarActions />
			</Suspense>
        </nav>
    )
}

export default NavBar