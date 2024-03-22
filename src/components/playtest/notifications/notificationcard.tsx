import { NotificationFrequencyList, NotificationSetting, NotificationSettingSchema, NotificationTargetTypeList, NotificationTargetTypeMap } from "@/model/notifications";
import { FC } from "react";
import styles from './notificationCard.module.scss'
import Select from "@/components/utils/select";
import { validate } from "@/model/utils";
import { DiscordServer } from "@/server/discord";
import { channel } from "diagnostics_channel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMultiply, faPlus, faX } from "@fortawesome/free-solid-svg-icons";
import { PlaytestSearchParams } from "@/model/playtest";
import SearchParams, { SearchParamsForm } from "../searchParams";

type PropType = {
    value: NotificationSetting,
    update: (updateCallback: (clone: NotificationSetting) => void) => void,
    disabled: boolean,
    discordServers: DiscordServer[],
    onDelete: () => void,
}

const NotificationCard: FC<PropType> = ({ value, update, disabled, discordServers, onDelete }) => {
    const { isValid, errorPaths } = validate(value, NotificationSettingSchema)
    const { target, filter, frequency, name } = value

    return (
        <li className={styles.target}>
            <section className={styles.name}>
                <label>Message Title:</label>

                <input
                    disabled={disabled}
                    type='text'
                    value={name}
                    onChange={e => update(clone => { clone.name = e.target.value })} />

                <button onClick={onDelete}>
                    <FontAwesomeIcon icon={faMultiply} />
                </button>
            </section>

            <h3>Target</h3>

            <div className={styles.row}>
                <label>Frequency:</label>

                <Select
                    value={frequency}
                    onChange={newValue => update(clone => { clone.frequency = newValue })}
                    options={NotificationFrequencyList.map(frequency => ({ label: frequency, value: frequency }))}
                    disabled={disabled}
                    className={`${styles.capitalize} ${errorPaths["frequency"] && styles.invalid}`} />
            </div>

            <div className={styles.row}>
                <label>Destination:</label>

                <Select
                    value={target.type} 
                    onChange={newValue => update(clone => {
                        if (newValue === "dm") clone.target = { type: "dm", userId: "" }
                        if (newValue === "channel") clone.target = { type: "channel", channelId: "", serverId: "" }
                    })}
                    options={NotificationTargetTypeList.map(type => ({ 
                        label: NotificationTargetTypeMap[type],
                        value: type
                    }))} 
                    disabled={disabled} />
            </div>

            {target.type === 'channel' ? (
                !discordServers.length ? (
                    <div>
                        To use this feature, you must install the discord bot on a server you own by clicking the button in the top right corner!
                    </div>
                ) : <>
                        <div className={styles.row}>
                            <label>Server:</label>

                            <Select 
                                value={target.serverId}
                                onChange={newValue => update(clone => {
                                    if (target.serverId === newValue) return;

                                    clone.target = { type: 'channel', serverId: newValue, channelId: "" }
                                })}
                                options={discordServers.map(server => ({ 
                                    label: server.name,
                                    value: server.id,
                                }))}
                                disabled={disabled}
                                className={target.serverId.length ? undefined : styles.invalid} />
                        </div>
                        
                        <div className={styles.row}>
                            <label>Channel:</label>

                            <Select
                                value={target.channelId}
                                onChange={newValue => update(clone => { clone.target = { ...target, channelId: newValue } })}
                                options={discordServers
                                    .find(serv => serv.id === target.serverId)?.channels.reverse()
                                    .map(channel => ({
                                        label: "#" + channel.name,
                                        value: channel.id,
                                    }))
                                    || []
                                }
                                disabled={disabled || !target.serverId} 
                                className={(!target.serverId.length || target.channelId.length) ? undefined : styles.invalid} />
                        </div>

                        <div className={styles.row}>
                            <label>Mention role:</label>

                            <div className={styles.role}>
                                <Select
                                    placeholder="(Optional)..."
                                    value={target.role}
                                    onChange={newValue => update(clone => { clone.target = {...target, role: newValue } })}
                                    options={discordServers
                                    .find(serv => serv.id === target.serverId)?.roles
                                    .map(role => ({
                                            label: role.name,
                                            value: role.id,
                                        }))
                                        || []
                                    }
                                    disabled={disabled || !target.serverId} />
                                
                                <button
                                    disabled={disabled || !target.serverId || !target.role}
                                    onClick={() => update(clone => {
                                        const { role, ...rest } = target
                                        clone.target = rest
                                    })}>
                                        <FontAwesomeIcon icon={faMultiply} />
                                </button>
                            </div>
                        </div>
                </>
            ) : <>
                <div>Note: to use this feature, you must be in at least one server where the Discord bot is present.</div>
            </>}

            <h3>Filter:</h3>

            <SearchParamsForm
                className={styles.filter}
                disabled={disabled}
                value={filter}
                update={callback => update(clone => { callback(clone.filter) })} />
        </li>
    )
}

export default NotificationCard