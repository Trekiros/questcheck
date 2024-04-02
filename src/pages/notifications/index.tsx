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
import { NotificationSetting, NotificationSettingSchema } from "@/model/notifications";
import { trpcClient } from "@/server/utils";
import NotificationCard from "@/components/playtest/notifications/notificationcard";
import { useRouter } from "next/router";
import { UserSchema } from "@/model/user";
import { z } from "zod";
import { validate } from "@/model/utils";
import { toast } from "sonner";
import Checkbox from "@/components/utils/checkbox";

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
    const clerkUser = useUser()
    const updateNotifications = trpcClient.users.updateNotifications.useMutation()
    const [notifications, setNotifications] = useState(userCtx!.user.playerProfile.notifications)
    const [pristine, setPristine] = useState(true)
    const [dmOnApply, setDmOnApply] = useState(userCtx?.user.playerProfile.dmOnApply || '')
    const [dmOnAccept, setDmOnAccept] = useState(userCtx?.user.playerProfile.dmOnAccept || '')
    const { isValid, errorPaths } = validate(notifications, z.array(NotificationSettingSchema))

    const disabled = !clerkUser.user || updateNotifications.isLoading

    function update(notifIndex: number, callback: (clone: NotificationSetting) => void) {
        const clone = structuredClone(notifications)
        callback(clone[notifIndex])
        setNotifications(clone)
        setPristine(false)
    }

    return (
        <Page userCtx={userCtx}>
            <div className={styles.notifPage}>
                { (discordServers.status === 'Success') ? <>
                    <div className={styles.header}>
                        <h1>Notification Settings</h1>

                        <div className={styles.actions}>
                            <button
                                disabled={disabled || (notifications.length >= UserSchema.shape.playerProfile.shape.notifications._def.maxLength!.value)}
                                onClick={() => {
                                    setNotifications([
                                        ...notifications,
                                        {
                                            name: 'New Playtests!',
                                            target: { type: 'channel', serverId: '', channelId: '' },
                                            frequency: "Once per day",
                                            filter: {},
                                        }
                                    ])
                                    setPristine(false)
                                }}>
                                    Add Notification
                                    <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <Link
                                className={discordServers.servers.length === 0 ? styles.highlight : undefined}
                                target="_blank"
                                href="https://discord.com/oauth2/authorize?client_id=1213884594319786074">
                                    Install Bot
                                    <FontAwesomeIcon icon={faDiscord} />
                            </Link>
                        </div>
                    </div>

                    <div className={styles.dmSettings}>
                        <h3>
                            Application Notifications:
                        </h3>

                        <div>
                            Note: to receive private messages from the QuestCheck Discord bot, you need to be present in a server where the bot is installed.
                        </div>

                        <Checkbox 
                            value={!!dmOnAccept} 
                            onToggle={on => {
                                setDmOnAccept(on ? discordServers.discordUserId : '')
                                setPristine(false)
                            }}>
                                Send me a private message when I am accepted in a playtest
                        </Checkbox>

                        { !!userCtx?.user.isPublisher && (
                            <Checkbox 
                                value={!!dmOnApply}
                                onToggle={on => {
                                    setDmOnApply(on ? discordServers.discordUserId : '')
                                    setPristine(false)
                                }}>
                                    Send me a private message when someone applies to a playtest I have created
                            </Checkbox>
                        )}
                    </div>

                    <h3>
                        New Playtest Notifications:
                    </h3>

                    {!notifications.length ? (
                        <div className={styles.placeholder}>
                            Create a notification to start...
                        </div>
                    ) : <>
                        <ul className={styles.targets}>
                            {notifications.map((notification, i) => (
                                <NotificationCard
                                    key={i}
                                    value={notification}
                                    update={callback => update(i, callback)} 
                                    disabled={disabled}
                                    discordServers={discordServers.servers}
                                    discordUserId={discordServers.discordUserId}
                                    onDelete={() => {
                                        const cloneArr = [...notifications]
                                        cloneArr.splice(i, 1)
                                        setNotifications(cloneArr)
                                    }} />
                            ))}
                        </ul>
                    </>}
                    
                    <button
                        className={styles.saveBtn}
                        disabled={disabled || pristine || !isValid}
                        onClick={async () => {
                            await updateNotifications.mutateAsync({ notifications, dmOnApply, dmOnAccept })
                            setPristine(true)
                            toast("Notification settings saved successfully!")
                        }}>
                            Save Changes
                            <FontAwesomeIcon icon={faCheck} />
                    </button>
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