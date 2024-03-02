import { FC, useEffect, useState } from "react"
import styles from './index.module.scss'
import { trpcClient } from "@/server/utils"
import { SystemFamiliarityList, SystemFamiliaritySchema, SystemNameSchema, User, UserSchema, isAlphanumeric, newUser } from "@/model/user"
import { Prettify, validate } from "@/model/utils"
import { z } from "zod"
import AutoResizeTextArea from "@/components/utils/autoResizeTextArea"
import Checkbox from "@/components/utils/checkbox"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faEye, faMultiply, faPen, faPlus } from "@fortawesome/free-solid-svg-icons"
import Select from "@/components/utils/select"
import { SystemsList } from "@/model/tags"
import Markdown from "@/components/utils/markdown"

type UserWithoutId = Prettify<Omit<User, "userId">>
const Validator: z.ZodType<UserWithoutId> = UserSchema.omit({ userId: true })

const SettingsPage: FC<{}> = () => {
    const userMutation = trpcClient.users.updateSelf.useMutation()
    const userQuery = trpcClient.users.getSelf.useQuery()
    const [user, setUser] = useState<UserWithoutId>(newUser())
    const { isValid, errorPaths } = validate(user, Validator)
    const [previewBio, setPreviewBio] = useState(false)

    const disabled = userQuery.isFetching || userMutation.isLoading

    useEffect(() => {
        if (!!userQuery.data) setUser({ ...user, ...userQuery.data })
    }, [userQuery.data])

    function update(callback: (clone: UserWithoutId) => void) {
        const clone = structuredClone(user)
        callback(clone)
        setUser(clone)
    }

    return (
        <div className={`${styles.settings} ${disabled && styles.disabled}`}>
            <h1>User Settings</h1>
            
            {/***************** BASIC INFO *****************/}
            <h3>Basic Info</h3>

            <div className={styles.row}>
                <label>User Name:</label>

                <div className="tooltipContainer">
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
                    
                    { errorPaths["userName"] && (
                        <div className='tooltip' style={{ background: "#322"}}>
                            { user.userName.length < 4 && <p>Must be at least 4 characters.</p> }
                            { !isAlphanumeric(user.userName) && <p>This must use alpha-numeric characters only.</p>}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.row}>
                <label>Bio (optional):</label>

                <div className={styles.withCharCount}>
                    <button onClick={() => setPreviewBio(!previewBio)} disabled={disabled} className={styles.previewToggle}>
                        { previewBio ? <>
                            <FontAwesomeIcon icon={faPen} />
                            Edit
                        </> : <>
                            <FontAwesomeIcon icon={faEye} />
                            Preview
                        </>}
                    </button>
                    
                    { previewBio ? (
                        <Markdown text={user.userBio} />
                    ) : <>
                        <AutoResizeTextArea
                            placeholder="Introduce yourself..."
                            disabled={disabled}
                            className={errorPaths["userBio"] && styles.invalid}
                            value={user.userBio}
                            onChange={e => update(clone => clone.userBio = e.target.value)} />
                        <label>{user.userBio.length}/600</label>
                    </>}

                </div>
            </div>

            <div className={styles.row}>
                <label>Account type:</label>

                <div className={styles.accountType}>
                    <Checkbox
                        disabled={disabled}
                        className={errorPaths["isPlayer"] && styles.invalid}
                        value={user.isPlayer}
                        onToggle={() => update(clone => clone.isPlayer = !user.isPlayer)}>
                            Player (enter playtests)
                    </Checkbox>

                    <Checkbox
                        disabled={disabled}
                        className={errorPaths["isPlayer"] && styles.invalid}
                        value={user.isPublisher}
                        onToggle={() => update(clone => clone.isPublisher = !user.isPublisher)}>
                            Publisher (create playtests)
                    </Checkbox>

                </div>
            </div>



            {/***************** Player INFO *****************/}
            { user.isPlayer && <>
                <h3>Player Profile</h3>

                <div className={styles.row}>
                    <label>TTRPG Familiarity:</label>

                    <div className={styles.systems}>
                        { !!user.playerProfile.systems.length && <ul>
                            { user.playerProfile.systems.map(({system, familiarity}, i) => (
                                <li key={i}>
                                    <Select
                                        placeholder="System Name"
                                        options={SystemsList.map(value => ({ value, label: value }))}
                                        value={system}
                                        onChange={newValue => update(clone => clone.playerProfile.systems[i].system = newValue )}
                                        freeEntry={true}
                                        disabled={disabled}
                                        className={SystemNameSchema.safeParse(system).success ? undefined : styles.invalid} />

                                    <Select
                                        placeholder="Your familiarity with the system"
                                        options={SystemFamiliarityList.map(value => ({ value, label: value }))}
                                        value={familiarity}
                                        onChange={newValue => update(clone => clone.playerProfile.systems[i].familiarity = newValue)}
                                        disabled={disabled}
                                        className={SystemFamiliaritySchema.safeParse(familiarity).success ? undefined : styles.invalid} />

                                    <button
                                        onClick={() => update(clone => clone.playerProfile.systems.splice(i, 1))}
                                        disabled={disabled}>
                                        <FontAwesomeIcon icon={faMultiply} />
                                    </button>
                                </li>
                            ))}
                        </ul> }

                        <button
                            onClick={() => update(clone => clone.playerProfile.systems.push({ system: 'System Name', familiarity: 'Is interested in'}))}
                            disabled={disabled}>
                            <FontAwesomeIcon icon={faPlus} />
                            Add Game
                        </button>
                    </div>
                </div>
            </> }



            {/***************** Player INFO *****************/}
            { user.isPublisher && <>
                <h3>Publisher Profile</h3>

                <div className={styles.row}>
                    <label>TTRPG Familiarity:</label>

                    <div>TODO</div>
                </div>
            </> }



            {/***************** ACTIONS *****************/}
            <section className={styles.actions}>
                <button
                    disabled={disabled || !isValid}
                    onClick={async () => { 
                        await userMutation.mutateAsync(user);
                        await userQuery.refetch()
                    }}>
                        <FontAwesomeIcon icon={faCheck} />
                        Save
                </button>
                
                <button
                    disabled={disabled}
                    onClick={() => setUser(userQuery.data || newUser())}>
                        <FontAwesomeIcon icon={faMultiply} />
                        Cancel
                </button>
            </section>
        </div>
    )
}

export default SettingsPage