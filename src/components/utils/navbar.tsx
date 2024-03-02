import { FC } from "react";
import styles from './navbar.module.scss'
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ClerkTheme } from "@/pages/sign-in/[[...index]]";
import TextSkeleton from "../skeleton/text";
import { trpcClient } from "@/server/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/router";
import CircleSkeleton from "../skeleton/circle";

const ActionsSkeleton = <div className={styles.skeleton}>
	<TextSkeleton lines={1} />
	<CircleSkeleton width={40} />
</div>
	
const NavBar: FC<{}> = ({}) => {
	const router = useRouter()
	const user = useUser()
	const userQuery = trpcClient.users.getSelf.useQuery()

	return (
        <nav className={styles.topNav}>
			<Link href="/" className={styles.logo}>
				<Image alt="Logo" src="/logo.webp" width={45} height={64} />
				Quest Check
			</Link>


			<div className={styles.actions}>
				{ !user.isLoaded ? ActionsSkeleton : (
					!user.isSignedIn ? <>
						<Link href="/sign-in">Sign In</Link>
						<Link href="/sign-up">Sign Up</Link>
					</> : (
						userQuery.isLoading ? ActionsSkeleton : (
							userQuery.data ? <>
								<Link href='/settings'>{userQuery.data.userName}</Link>
								<UserButton appearance={ClerkTheme} />
							</> : <>
								{ (router.route !== '/settings') && <Link href='/settings' className={styles.warning}>
									<FontAwesomeIcon icon={faWarning} />
									Update User Info
								</Link> }
								<UserButton appearance={ClerkTheme} />
							</>
						)
					)
				)}
			</div>
        </nav>
    )
}

export default NavBar