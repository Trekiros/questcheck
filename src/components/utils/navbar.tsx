import { FC, useState } from "react";
import styles from './navbar.module.scss'
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ClerkTheme } from "@/pages/sign-in/[[...index]]";
import TextSkeleton from "../skeleton/text";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes, faWarning } from "@fortawesome/free-solid-svg-icons";
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
	const forceCron = trpcClient.cron.force.useMutation()
	const [modalType, setModalType] = useState<null|'ban'|'validate'|'forceCron'>(null)
	const [userName, setUserName] = useState("")
	const [href, setHref] = useState("")

	const disabled = banUser.isLoading
		|| validateUser.isLoading
		|| forceCron.isLoading

	function showBanModal() {
		setUserName("")
		setModalType('ban')
	}

	function showValidateUser() {
		setUserName("")
		setHref("")
		setModalType('validate')
	}

	function showForceCron() {
		setModalType('forceCron')
	}

	return (
		<>
			<button onClick={showBanModal}>
				Ban User
			</button>
			<button onClick={showValidateUser}>
				Validate User
			</button>
			<button onClick={showForceCron}>
				Force Cron
			</button>

			{ !!modalType && (
				<Modal className={styles.admin} onCancel={() => setModalType(null)}>
					<h3>{modalType.toLocaleUpperCase()}</h3>

					{(modalType === 'ban' || modalType === 'validate') && (
						<div className={styles.row}>
							<label>Username:</label>
							<input
								disabled={disabled}
								type="text"
								value={userName}
								onChange={e => setUserName(e.target.value)} />
						</div>
					)}

					{ modalType === 'ban' ? (
						<>
							<button 
								disabled={disabled}
								onClick={async () => { await banUser.mutateAsync(userName); setModalType(null) }}>
									Confirm
							</button>
						</>
					) : (modalType === 'validate') ? (
						<>
							<div className={styles.row}>
								<label>href:</label>
								<input
									disabled={disabled}
									type="text"
									value={href}
									onChange={e => setHref(e.target.value)} />
							</div>

							<button 
								disabled={disabled}
								onClick={async () => { await validateUser.mutateAsync({ userName, href }); setModalType(null) }}>
								Confirm
							</button>
						</>
					) : (modalType === 'forceCron') ? (
						<button 
							disabled={disabled}
							onClick={async () => { await forceCron.mutateAsync(); setModalType(null) }}>
                            	Confirm
                        </button>
					) : null}
				</Modal>
			)}
		</>
	)
}

const NavbarLinks: FC<{ user: NonNullable<ReturnType<typeof useUserCtx>> }> = ({ user }) => {
	const router = useRouter()

	function linkProps(href: string) {
		return { 
			href, 
			className: (router.route === href)
				? styles.active
				: undefined,
		}
	}

	return (
		<div className={styles.links}>
			{ user.permissions.admin && <>
				<AdminActions />
			</>}

			<Link {...linkProps('/about')}>About</Link>

			{ user.user.isPlayer && <>
				<Link {...linkProps('/notifications')}>Notification Settings</Link>
				<Link {...linkProps('/applications')}>My Applications</Link>
			</>}

			{ user.user.isPublisher && (
				<Link {...linkProps('/playtest')}>My Playtests</Link>
			)}

			<Link {...linkProps('/settings')}>{user.user.userName} { user.permissions.admin ? <i>(admin)</i> : null }</Link>
			<UserButton appearance={ClerkTheme} afterSignOutUrl="/"  />
		</div>
	)
}

const NavBar: FC<{}> = ({}) => {
	const router = useRouter()
	const clerkUser = useUser()
	const mongoUser = useUserCtx()
	const [sidebar, setSidebar] = useState(false)

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
							<NavbarLinks user={mongoUser} />
							
							<button className={styles.burger} onClick={() => setSidebar(true)}>
								<FontAwesomeIcon icon={faBars} />
							</button>
						</> : <>
							{ (router.route !== '/settings') && <Link href='/settings' className={styles.warning}>
								<FontAwesomeIcon icon={faWarning} />
								Update User Info
							</Link> }
							<UserButton appearance={ClerkTheme} afterSignOutUrl="/" />
						</>
					)
				)}
			</div>

			{ mongoUser && sidebar && (
				<div className={styles.sideMenuBackdrop} onClick={() => setSidebar(false)}>
					<div className={styles.sideMenu} onClick={e => e.stopPropagation()}>
						<NavbarLinks user={mongoUser} />

						<button className={styles.close} onClick={() => setSidebar(false)}>
							<FontAwesomeIcon icon={faTimes} />
						</button>
					</div>
				</div>
			)}
        </nav>
    )
}

export default NavBar