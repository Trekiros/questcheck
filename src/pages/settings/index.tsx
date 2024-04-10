import { FC, useEffect, useState } from "react"
import styles from './index.module.scss'
import { trpcClient } from "@/server/utils"
import { MutableUser, MutableUserSchema, SystemFamiliarityList, SystemNameSchema, UserSchema, newUser } from "@/model/user"
import { isAlphanumeric, validate } from "@/model/utils"
import Checkbox from "@/components/utils/checkbox"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faMultiply, faPlus, faStar } from "@fortawesome/free-solid-svg-icons"
import { SystemsList } from "@/model/tags"
import MarkdownTextArea from "@/components/utils/markdownTextArea"
import FreeEntrySelect from "@/components/utils/freeEntrySelect"
import { useUser } from "@clerk/nextjs"
import DotSkeleton from "@/components/skeleton/dots"
import { faTwitter, faXTwitter, faYoutube } from "@fortawesome/free-brands-svg-icons"
import { useRouter } from "next/router"
import Link from "next/link"
import { toast } from "sonner"
import { NextSeo } from "next-seo"
import Page, { ServerSideProps } from "@/components/utils/page"
import { GetServerSideProps } from "next"
import { getAuth, buildClerkProps } from "@clerk/nextjs/server";
import { YoutubeInfo, getYoutubeInfo } from "@/server/youtube"
import { ReviewsDisplay } from "@/components/playtest/details/review"
import { getUserCtx } from "@/components/utils/pageProps"
import { useDialog } from "@/components/utils/dialog"

type PageProps = ServerSideProps & {
    youtube: YoutubeInfo,
}


export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
    const auth = getAuth(ctx.req)
    if (!auth.userId) throw new Error('Unauthorized')

    return {
        props: {
            ...buildClerkProps(ctx.req),
            userCtx: await getUserCtx(auth.userId, { withReviews: true }),
            youtube: await getYoutubeInfo(auth.userId),
        }
    }
}

const SettingsPage: FC<PageProps> = ({ userCtx, youtube }) => {
    const router = useRouter()
    const clerkUser = useUser()
    const { setDialog } = useDialog()
    
    const [user, setUser] = useState<MutableUser>(userCtx?.user || newUser)
    const { isValid, errorPaths } = validate(user, MutableUserSchema)
    const [checkingUserName, setCheckingUserName] = useState(false)
    const [userNameTaken, setUsernameTaken] = useState(false)

    const twitterUsername = clerkUser.user?.externalAccounts.find(socialConnection => socialConnection.provider === 'x')?.username

    const usernameTakenQuery = trpcClient.users.isUsernameTaken.useMutation()
    const userMutation = trpcClient.users.updateSelf.useMutation()
    const disabled = userMutation.isLoading

    if (!userCtx) {
        useEffect(() => {

        }, [clerkUser])
    }

    // On username changed: wait 2s then check if it's taken
    useEffect(() => {
        if (!isValid) return;

        // No need to check if the current username hasn't been changed
        if (user.userName === userCtx?.user.userName) return;

        setCheckingUserName(true)

        const timeout = setTimeout(async () => {
            const result = await usernameTakenQuery.mutateAsync(user.userName)

            setUsernameTaken(result)
            setCheckingUserName(false)
        }, 2000)

        return () => {
            clearTimeout(timeout)
            setCheckingUserName(false)
        }
    }, [user.userName, userCtx?.user.userName, isValid])

    function update(callback: (clone: MutableUser) => void) {
        const clone = structuredClone(user)
        callback(clone)
        setUser(clone)
    }

    return (
        <Page userCtx={userCtx}>
            <div className={`${styles.settings} ${disabled && styles.disabled}`}>
                <NextSeo title="User Settings" />

                <h1>User Settings</h1>
                
                {/***************** BASIC INFO *****************/}
                <h3>Basic Info</h3>

                <div className={styles.row}>
                    <label>User Name:</label>

                    <div className={`tooltipContainer ${styles.username}`}>
                        <input
                            disabled={disabled}
                            className={errorPaths["userName"] && styles.invalid}
                            type='text'
                            value={user.userName}
                            onChange={e => {
                                if (isAlphanumeric(e.target.value)) {
                                    update(clone => clone.userName = e.target.value)
                                }
                            }} />

                        {
                            (checkingUserName || errorPaths['userName']) ? <DotSkeleton />
                            : userNameTaken ? (
                                <div className={styles.taken}>
                                    <FontAwesomeIcon icon={faMultiply} />
                                    taken!
                                </div> 
                            ) : (
                                <div className={styles.free}>
                                    <FontAwesomeIcon icon={faCheck} />
                                    free!
                                </div>
                            )
                        }
                        
                        { errorPaths["userName"] && (
                            <div className='tooltip' style={{ background: "#322"}}>
                                { user.userName.length < 4 && <p>Must be at least 4 characters.</p> }
                                { user.userName.length > 50 && <p>Must be at most 50 characters.</p> }
                                { !isAlphanumeric(user.userName) && <p>This must use alpha-numeric characters only.</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.row}>
                    <label>Bio (optional):</label>

                    <MarkdownTextArea
                        placeholder="Introduce yourself... (you can use Markdown!)"
                        disabled={disabled}
                        className={errorPaths["userBio"] && styles.invalid}
                        value={user.userBio}
                        onChange={e => update(clone => clone.userBio = e.target.value)}
                        maxLength={600}/>

                </div>

                <div className={styles.row}>
                    <label>Account type:</label>

                    <div className={styles.accountType}>
                        <Checkbox
                            disabled={disabled}
                            className={errorPaths["isPlayer"] && styles.invalid}
                            value={user.isPlayer}
                            onToggle={() => update(clone => {
                                clone.isPlayer = !user.isPlayer
                                if (errorPaths['playerProfile']) clone.playerProfile = newUser.playerProfile
                            })}>
                                Player (enter playtests)
                        </Checkbox>

                        <Checkbox
                            disabled={disabled}
                            className={errorPaths["isPlayer"] && styles.invalid}
                            value={user.isPublisher}
                            onToggle={() => update(clone => {
                                clone.isPublisher = !user.isPublisher
                                if (errorPaths['publisherProfile']) clone.publisherProfile = newUser.publisherProfile
                            })}>
                                Publisher (create playtests)
                        </Checkbox>

                    </div>
                </div>



                {/***************** Player INFO *****************/}
                { user.isPlayer && <>
                    <hr />

                    <h3>Player Profile</h3>

                    
                    <div className={styles.row}>
                        <label>Credit me as:</label>

                        <input
                            disabled={disabled}
                            className={(UserSchema.shape.playerProfile.shape.creditName.maxLength! < user.playerProfile.creditName.length) ? styles.invalid : undefined}
                            type='text'
                            value={user.playerProfile.creditName}
                            onChange={e => {
                                update(clone => {
                                    if (UserSchema.shape.playerProfile.shape.creditName.maxLength! < e.target.value.length) return;

                                    clone.playerProfile.creditName = e.target.value
                                })
                            }}/>
                    </div>

                    <div className={styles.row}>
                        <label>TTRPG Familiarity:</label>

                        <div className={styles.systems}>
                            { !!user.playerProfile.systems.length && <ul>
                                { user.playerProfile.systems.map(({system, familiarity, details}, i) => (
                                    <li key={i}>
                                        <div className={styles.firstRow}>
                                            <FreeEntrySelect
                                                placeholder="System Name"
                                                suggestions={SystemsList}
                                                value={system}
                                                onChange={newValue => update(clone => clone.playerProfile.systems[i].system = newValue )}
                                                disabled={disabled}
                                                classNames={{
                                                    input: `${styles.systemSelect} ${SystemNameSchema.safeParse(system).success ? undefined : styles.invalid}`,
                                                }} />

                                            <div className={styles.familiarity}>
                                                <span className={styles.stars}>
                                                    {[1,2,3,4,5].map(star => (
                                                        <button
                                                            key={star}
                                                            className={`tooltipContainer ${familiarity >= star ? styles.familiar : ''}`}
                                                            onClick={() => update(clone => clone.playerProfile.systems[i].familiarity = star)}>
                                                                <FontAwesomeIcon icon={faStar} />
                                                                <div className="tooltip" style={{background: "#322"}} onClick={e => e.stopPropagation()}>
                                                                    {SystemFamiliarityList[star - 1]}
                                                                </div>
                                                        </button>
                                                    ))}
                                                </span>

                                                <label>{SystemFamiliarityList[familiarity - 1]}</label>
                                            </div>

                                            <button
                                                onClick={() => update(clone => clone.playerProfile.systems.splice(i, 1))}
                                                disabled={disabled}>
                                                <FontAwesomeIcon icon={faMultiply} />
                                            </button>
                                        </div>

                                        <div className={styles.withCharCount}>
                                            <MarkdownTextArea
                                                placeholder="Details (optional)"
                                                disabled={disabled}
                                                className={(details.length > 300) ? styles.invalid : undefined}
                                                value={user.playerProfile.systems[i].details}
                                                onChange={e => update(clone => clone.playerProfile.systems[i].details = e.target.value)} 
                                                maxLength={300} />
                                        </div>
                                    </li>
                                ))}
                            </ul> }

                            <button
                                onClick={() => update(clone => clone.playerProfile.systems.push({ system: '', familiarity: 1, details: ''}))}
                                disabled={disabled || user.playerProfile.systems.length >= 20}>
                                <FontAwesomeIcon icon={faPlus} />
                                Add Game
                            </button>
                        </div>
                    </div>

                    { !!userCtx?.reviews.length && (
                        <div className={styles.reviews}>
                            <ReviewsDisplay reviews={userCtx.reviews}/>
                        </div>
                    )}
                </> }



                {/***************** Publisher INFO *****************/}
                { user.isPublisher && <>
                    <hr />

                    <h3>Publisher Profile</h3>

                    <div className={styles.row}>
                        <label>Proof of identity:</label>

                        <div className={styles.proof}>
                            <div>
                                This is used to display your legitimacy as a publisher. 
                                Playtests you post will include a link to your socials, to prove to players that you are who you claim to be. 
                                You need at least one proof to be active to be allowed to create playtests on this website.
                            </div>

                            <div className={styles.proofType}>
                                <Checkbox
                                    disabled={disabled || !twitterUsername}
                                    value={!!user.publisherProfile.twitterProof}
                                    onToggle={enabled => {
                                        if (enabled) update(clone => clone.publisherProfile.twitterProof = twitterUsername)
                                        else update(clone => clone.publisherProfile.twitterProof = '')
                                    }}>
                                        Twitter <FontAwesomeIcon icon={faTwitter} /> / <FontAwesomeIcon icon={faXTwitter} />
                                </Checkbox>
                                { !twitterUsername && (
                                    <span className={styles.warning}>
                                        To use this feature, you must link your Twitter/X account by clicking
                                        <button disabled={disabled} style={{ padding: "6px", margin: '0 1ch', display: "inline-block" }} onClick={() => setDialog(
                                            "You are about to leave this page. Any change you have not saved will be lost. Are you sure you wish to proceed?",
                                            async (confirm) => {
                                                if (!confirm) return;
                                                
                                                // OAuth process
                                                const externalAccount = await clerkUser.user?.createExternalAccount({
                                                    strategy: "oauth_x",
                                                    redirectUrl: '/sso-callback',
                                                })

                                                const url = externalAccount?.verification!.externalVerificationRedirectURL
                                                if (url) router.push(url)
                                            }
                                        )}>
                                            here
                                        </button>!
                                    </span>
                                )}
                            </div>

                            <div className={styles.proofType}>
                                <Checkbox
                                    disabled={disabled || (youtube.status !== 'success')}
                                    value={!!user.publisherProfile.youtubeProof}
                                    onToggle={enabled => {
                                        if (enabled) update(clone => {
                                            if (youtube.status === 'success') clone.publisherProfile.youtubeProof = youtube.channelId
                                        })
                                        else update(clone => clone.publisherProfile.youtubeProof = '')
                                    }}>
                                        Youtube <FontAwesomeIcon icon={faYoutube} />
                                </Checkbox>
                                { (youtube.status !== 'success') && (
                                    <span className={styles.warning}>
                                        To use this feature, you must link your Youtube account by clicking
                                        <button disabled={disabled} style={{ padding: "6px", margin: '0 1ch', display: "inline-block" }} onClick={() => setDialog(
                                            "You are about to leave this page. Any change you have not saved will be lost. Are you sure you wish to proceed?",
                                            async (confirm) => {
                                                if (!confirm) return;
                                                
                                                // OAuth process
                                                const externalAccount = await clerkUser.user?.createExternalAccount({
                                                    strategy: "oauth_google",
                                                    redirectUrl: '/sso-callback',
                                                })

                                                const url = externalAccount?.verification!.externalVerificationRedirectURL
                                                if (url) router.push(url)
                                            }
                                        )}>
                                            here
                                        </button>!

                                        { (youtube.status === 'no youtube access') && (
                                            " (You have already linked a Google account, but haven't granted access to the associated Youtube channel)"
                                        )}

                                        { (youtube.status === 'no youtube account') && (
                                            " (You have already linked a Google account, but this account isn't linked to a Youtube channel)"
                                        )}
                                    </span>
                                )}
                            </div>

                            <div className={styles.proofType}>
                                <Checkbox
                                    value={!!user.publisherProfile.manualProof}
                                    onToggle={() => {}}
                                    disabled={true}>
                                        Manual Proof
                                </Checkbox>

                                { !user.publisherProfile.manualProof && (
                                    <span className={styles.warning}>
                                        If you don't use Twitter nor Youtube, you can ask for a manual verification (this may take multiple days). 
                                        To do it, contact Trekiros on <Link href="https://discord.com/invite/9AJtv5DJ6f" target="_blank">Discord</Link>, <Link href="https://bsky.app/profile/trekiros.bsky.social" target="_blank">Bluesky</Link>, <Link href='https://dice.camp/@trekiros' target="_blank">Mastodon</Link>, or by <Link href='mailto:trekiros.contact@gmail.com'>email</Link>.
                                        Please include a link to a website or social media account you own, and proof that you do in fact own it.
                                        This link will be displayed in the header of any playtest you post on QuestCheck.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <label>Publisher Resources</label>

                        <div className={styles.vstack}>
                            <div style={{ paddingTop: "1em" }}>You might find the following resources helpful in organizing a playtest:</div>

                            <ul>
                                <li>
                                    <Link href="https://chromewebstore.google.com/detail/atom20/bgnbdhlpicccdnhhpihcpccejngaionp" target="_blank">Atom20</Link>: a Chrome extension allowing you to create a character sheet or a bestiary on Google Sheets, 
                                    and binds it to Roll20 so you can use the spreadsheet to send dice rolls, or update a character's health bar.
                                    This extension allows you to iterate extremely quickly, as spreadsheets are easy to set up and modify for any purpose.
                                </li>
                                <li>
                                    <Link href="https://www.drivethrurpg.com/product/437880/Pestos-Guide-to-Testing?src=questcheck" target="_blank">Pesto's Guide to Testing</Link>: a comprehensive guide to TTRPG testing full of advice for new and experienced creators alike,
                                    by <Link href="https://twitter.com/PestoEnthusiast" target="_blank">Spencer Hibnick</Link>.
                                </li>
                                <li>
                                    <Link href="https://www.youtube.com/watch?v=on7endO4lPY" target="_blank">Playtesting - How to Get Good Feedback on Yout Game</Link>, by Extra Credits on Youtube. 
                                    This is a short 7 minutes video, which covers all of the most important points of how to interpret playtest feedback.
                                    Though it was made with video games rather than tabletop RPGs in mind, pretty much all of it can be applied to TTRPG design.
                                </li>
                            </ul>
                        </div>
                    </div>
                </> }

                <hr />

                {/***************** ACTIONS *****************/}
                <section className={styles.actions}>
                    <button
                        disabled={disabled || !isValid || checkingUserName || userNameTaken}
                        onClick={async () => { 
                            await userMutation.mutateAsync(user);
                            toast("User info updated")
                        }}>
                            <FontAwesomeIcon icon={faCheck} />
                            Save
                    </button>
                    
                    <button
                        disabled={disabled || checkingUserName}
                        onClick={() => {
                            setUser(userCtx?.user || newUser)
                            toast("User info reset")
                        }}>
                            <FontAwesomeIcon icon={faMultiply} />
                            Cancel
                    </button>
                </section>
            </div>
        </Page>
    )
}

export default SettingsPage