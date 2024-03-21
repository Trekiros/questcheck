import { NotificationSetting, NotificationTargetTypeList, NotificationTargetTypeMap } from "@/model/notifications";
import { FC } from "react";
import styles from './notificationCard.module.scss'
import Select from "@/components/utils/select";

type PropType = {
    value: NotificationSetting,
    update: (updateCallback: (clone: NotificationSetting) => void) => void,
}

const NotificationCard: FC<PropType> = ({ value: { target, filters, frequency }, update }) => {
    return (
        <li className={styles.target}>
            <h2>Target</h2>

            <div className={styles.row}>
                <label>Target Type</label>

                <Select
                    value={target.type} 
                    onChange={newValue => update(clone => {
                        if (newValue === "dm") clone.target = { type: "dm", userId: "" }
                        if (newValue === "channel") clone.target = { type: "channel", channelId: "", serverId: "" }
                    })}
                    options={NotificationTargetTypeList.map(type => ({ 
                        label: NotificationTargetTypeMap[type],
                        value: type
                    }))} />
            </div>
        </li>
    )
}

export default NotificationCard