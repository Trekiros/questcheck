import { FC, useEffect, useState } from "react"
import styles from './index.module.scss'
import { trpcClient } from "@/server/utils"
import { MutableUser, MutableUserSchema, SystemFamiliarityList, SystemNameSchema, isAlphanumeric, newUser } from "@/model/user"
import { validate } from "@/model/utils"
import Checkbox from "@/components/utils/checkbox"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faMultiply, faPlus, faStar } from "@fortawesome/free-solid-svg-icons"
import { SystemsList } from "@/model/tags"
import MarkdownTextArea from "@/components/utils/markdownTextArea"
import FreeEntrySelect from "@/components/utils/freeEntrySelect"
import { useUser } from "@clerk/nextjs"
import DotSkeleton from "@/components/skeleton/dots"
import { faFacebook, faTwitter, faXTwitter } from "@fortawesome/free-brands-svg-icons"
import { useRouter } from "next/router"
import Link from "next/link"
import { toast } from "sonner"
import { NextSeo } from "next-seo"

const SettingsPage: FC<{}> = () => {
    const router = useRouter()
    const userMutation = trpcClient.users.updateSelf.useMutation()
    const userQuery = trpcClient.users.getSelf.useQuery()
    const [user, setUser] = useState<MutableUser>(newUser)
    const { isValid, errorPaths } = userQuery.isFetching ? {isValid: false, errorPaths: {} } : validate(user, MutableUserSchema)

    const usernameTakenQuery = trpcClient.users.isUsernameTaken.useMutation()
    const [checkingUserName, setCheckingUserName] = useState(false)
    const [userNameTaken, setUsernameTaken] = useState(false)

    const clerkUser = useUser()
    const twitterUsername = clerkUser.user?.externalAccounts.find(socialConnection => socialConnection.provider === 'x')?.username
    const facebookUsername = clerkUser.user?.externalAccounts.find(socialConnection => socialConnection.provider === 'facebook')?.username

    const disabled = userQuery.isFetching || userMutation.isLoading

    // On load, override the local state
    useEffect(() => {
        if (!!userQuery.data) setUser(userQuery.data)
    }, [userQuery.data])

    // On username changed: wait 2s then check if it's taken
    useEffect(() => {
        if (!isValid) return;

        // No need to check if the current username hasn't been changed
        if (user.userName === userQuery.data?.userName) return;

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
    }, [user.userName, userQuery.data?.userName, isValid])

    function update(callback: (clone: MutableUser) => void) {
        const clone = structuredClone(user)
        callback(clone)
        setUser(clone)
    }

    return (
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
                                    <button disabled={disabled} style={{ padding: "6px", margin: '0 1ch', display: "inline-block" }} onClick={async () => {
                                        // Saving the user's work in progress, just in case
                                        if (isValid) await userMutation.mutateAsync(user)
                                        
                                        // OAuth process
                                        const externalAccount = await clerkUser.user?.createExternalAccount({
                                            strategy: "oauth_x",
                                            redirectUrl: '/sso-callback',
                                        })

                                        const url = externalAccount?.verification!.externalVerificationRedirectURL
                                        if (url) router.push(url)
                                    }}>
                                        here
                                    </button>!
                                </span>
                            )}
                        </div>

                        <div className={styles.proofType}>
                            <Checkbox
                                disabled={disabled || !facebookUsername}
                                value={!!user.publisherProfile.facebookProof}
                                onToggle={enabled => {
                                    if (enabled) update(clone => clone.publisherProfile.facebookProof = facebookUsername)
                                    else update(clone => clone.publisherProfile.facebookProof = '')
                                }}>
                                    Facebook <FontAwesomeIcon icon={faFacebook} />
                            </Checkbox>
                            { !facebookUsername && (
                                <span className={styles.warning}>
                                    To use this feature, you must link your Facebook account by clicking
                                    <button disabled={disabled} style={{ padding: "6px", margin: '0 1ch', display: "inline-block" }} onClick={async () => {
                                        // Saving the user's work in progress, just in case
                                        if (isValid) await userMutation.mutateAsync(user)
                                        
                                        // OAuth process
                                        const externalAccount = await clerkUser.user?.createExternalAccount({
                                            strategy: "oauth_facebook",
                                            redirectUrl: '/sso-callback',
                                        })

                                        const url = externalAccount?.verification!.externalVerificationRedirectURL
                                        if (url) router.push(url)
                                    }}>
                                        here
                                    </button>!
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
                                    If you don't use Twitter nor Facebook, you can ask for a manual verification (this may take multiple days). 
                                    To do it, contact Trekiros on <Link href="https://bsky.app/profile/trekiros.bsky.social">Bluesky</Link>, <Link href='https://dice.camp/@trekiros'>Mastodon</Link>, or by <Link href='mailto:trekiros.contact@gmail.com'>email</Link>.
                                    You must use the account or email address you give to your customers so they can contact you, or your request will be rejected.
                                    This account or email address will be the one which will be displayed on the playtests you create.
                                </span>
                            )}
                        </div>
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
                        await userQuery.refetch()
                        toast("User info updated")
                    }}>
                        <FontAwesomeIcon icon={faCheck} />
                        Save
                </button>
                
                <button
                    disabled={disabled || checkingUserName}
                    onClick={() => {
                        setUser(userQuery.data || newUser)
                        toast("User info reset")
                    }}>
                        <FontAwesomeIcon icon={faMultiply} />
                        Cancel
                </button>
            </section>
        </div>
    )
}

export default SettingsPage