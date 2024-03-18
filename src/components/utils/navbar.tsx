import { FC, useState } from "react";
import styles from './navbar.module.scss'
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ClerkTheme } from "@/pages/sign-in/[[...index]]";
import TextSkeleton from "../skeleton/text";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/router";
import CircleSkeleton from "../skeleton/circle";
import { useUserCtx } from "./page";
import { useDialog } from "./dialog";
import { trpcClient } from "@/server/utils";
import Modal from "./modal";

const ActionsSkeleton = <div className={styles.skeleton}>
	<TextSkeleton lines={1} />
	<CircleSkeleton width={40} />
</div>

const AdminActions: FC<{}> = ({}) => {
	const banUser = trpcClient.users.banUser.useMutation()
	const validateUser = trpcClient.users.validateUser.useMutation()
	const [modalType, setModalType] = useState<null|'ban'|'validate'>(null)
	const [userName, setUserName] = useState("")
	const [href, setHref] = useState("")

	function showBanModal() {
		setUserName("")
		setModalType('ban')
	}

	function showValidateUser() {
		setUserName("")
		setHref("")
		setModalType('validate')
	}

	return (
		<>
			<button onClick={showBanModal}>
				Ban User
			</button>
			<button onClick={showValidateUser}>
				Validate User
			</button>

			{ !!modalType && (
				<Modal className={styles.admin} onCancel={() => setModalType(null)}>
					<h3>{modalType.toLocaleUpperCase()}</h3>

					<div className={styles.row}>
						<label>Username:</label>
						<input
							type="text"
							value={userName}
							onChange={e => setUserName(e.target.value)} />
					</div>

					{ modalType === 'ban' ? (
						<>
							<button onClick={async () => { await banUser.mutateAsync(userName); setModalType(null) }}>
								Confirm
							</button>
						</>
					) : (modalType === 'validate') ? (
						<>
							<div className={styles.row}>
								<label>href:</label>
								<input
									type="text"
									value={href}
									onChange={e => setHref(e.target.value)} />
							</div>

							<button onClick={async () => { await validateUser.mutateAsync({ userName, href }); setModalType(null) }}>
								Confirm
							</button>
						</>
					) : null}
				</Modal>
			)}
		</>
	)
}

const NavBar: FC<{}> = ({}) => {
	const router = useRouter()
	const clerkUser = useUser()
	const mongoUser = useUserCtx()

	return (
        <nav className={styles.topNav}>
			<Link href="/" className="logo">
				<Image alt="Logo" src="/logo.webp" width={45} height={64} />
				Quest Check
			</Link>

			<div className={styles.actions}>
				{ !clerkUser.isLoaded ? ActionsSkeleton : (
					!clerkUser.isSignedIn ? <>
						<Link href="/sign-in">Sign In</Link>
						<Link href="/sign-up">Sign Up</Link>
					</> : (
						!!mongoUser?.user ? <>
							{ mongoUser.permissions.admin && <>
								<AdminActions />
							</>}

							{ mongoUser.user.isPlayer && (
								<Link href='/applications'>My Applications</Link>
							)}

							{ mongoUser.user.isPublisher && (
								<Link href='/playtest'>My Playtests</Link>
							)}

							<Link href='/settings'>{mongoUser.user.userName} { mongoUser.permissions.admin ? <i>(admin)</i> : null }</Link>
							<UserButton appearance={ClerkTheme} />
						</> : <>
							{ (router.route !== '/settings') && <Link href='/settings' className={styles.warning}>
								<FontAwesomeIcon icon={faWarning} />
								Update User Info
							</Link> }
							<UserButton appearance={ClerkTheme} />
						</>
					)
				)}
			</div>
        </nav>
    )
}

export default NavBar