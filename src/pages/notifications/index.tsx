import Page, { ServerSideProps } from "@/components/utils/page";
import { FC, useState } from "react";
import styles from './index.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { serverPropsGetter } from "@/components/utils/pageProps";
import { faCheck, faPlus } from "@fortawesome/free-solid-svg-icons";
import { getAuth } from "@clerk/nextjs/server";
import { getDiscordServers } from "@/server/discord";
import { useUser } from "@clerk/nextjs";
import { NotificationSetting } from "@/model/notifications";
import { trpcClient } from "@/server/utils";
import NotificationCard from "@/components/playtest/notifications/notificationcard";
import { useRouter } from "next/router";

type PageProps = ServerSideProps & {
    discordServers: Awaited<ReturnType<typeof getDiscordServers>>,
}

export const getServerSideProps: ServerSidePropsGetter<PageProps> = async (ctx) => {
    const auth = getAuth(ctx.req)
    if (!auth.userId) return { redirect: { destination: '/', permanent: false } }

    // This page is for player accounts only!
    const baseProps = (await serverPropsGetter(ctx)).props
    if (!baseProps.userCtx?.user.isPlayer) return { redirect: { destination: '/', permanent: false } }

    return {
        props: {
            ...baseProps,
            discordServers: await getDiscordServers(auth.userId),
        }
    }
}

const NotificationPage: FC<PageProps> = ({ userCtx, discordServers }) => {
    const router = useRouter()
    const updateSelf = trpcClient.users.updateSelf.useMutation()
    const clerkUser = useUser()
    const isDiscord = !!clerkUser.user?.externalAccounts.find(acc => acc.provider === 'discord') // True if the user has a discord account linked
    const [notifications, setNotifications] = useState(userCtx!.user.playerProfile.notifications)
    const [pristine, setPristine] = useState(true)
    
    const disabled = updateSelf.isLoading
        || !clerkUser.user

    function update(notifIndex: number, callback: (clone: NotificationSetting) => void) {
        const clone = structuredClone(notifications)
        callback(clone[notifIndex])
        setNotifications(clone)
        setPristine(false)
    }

    return (
        <Page userCtx={userCtx}>
            <div className={styles.notifPage}>
                { isDiscord ? <>
                    <div className={styles.header}>
                        <h1>Notification Settings</h1>

                        <div className={styles.actions}>
                            <button
                                disabled={disabled}
                                onClick={() => {
                                    setNotifications([
                                        ...notifications,
                                        {
                                            target: { type: 'channel', serverId: '', channelId: '' },
                                            frequency: "every 4 hours",
                                            filters: [ { name: 'New Playtest', filter: {} } ],
                                        }
                                    ])
                                    setPristine(false)
                                }}>
                                    Add Target
                                    <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <Link 
                                target="_blank"
                                href="https://discord.com/oauth2/authorize?client_id=1213884594319786074">
                                    QuestCheck Bot
                                    <FontAwesomeIcon icon={faDiscord} />
                            </Link>
                        </div>
                    </div>

                    {!notifications.length ? (
                        <div className={styles.placeholder}>
                            Create a notification target to start...
                        </div>
                    ) : <>
                        <ul className={styles.targets}>
                            {notifications.map((notification, i) => (
                                <NotificationCard
                                    key={i}
                                    value={notification}
                                    update={callback => update(i, callback)} />
                            ))}
                        </ul>

                        <button
                            className={styles.saveBtn}
                            disabled={disabled || pristine}
                            onChange={async () => {
                                await updateSelf.mutateAsync({
                                    ...userCtx!.user,
                                    playerProfile: {
                                        systems: userCtx!.user.playerProfile.systems,
                                        notifications,
                                    }
                                })
                                setPristine(true)
                            }}>
                                Save Changes
                                <FontAwesomeIcon icon={faCheck} />
                        </button>
                    </>}
                </> : <>
                    <div className={styles.discord}>
                        <h2><FontAwesomeIcon icon={faDiscord} /> Discord Connection</h2>

                        <div>
                            To use these features, you need to link your QuestCheck account to your Discord account.
                        </div>

                        <button onClick={async () => {
                            const externalAccount = await clerkUser.user?.createExternalAccount({
                                strategy: "oauth_discord",
                                redirectUrl: '/sso-callback',
                            })

                            const url = externalAccount?.verification!.externalVerificationRedirectURL
                            if (url) router.push(url)
                        }}>
                            Link my account!
                            <FontAwesomeIcon icon={faCheck} />
                        </button>
                    </div>
                </>}
            </div>
        </Page>
    )
}

export default NotificationPage