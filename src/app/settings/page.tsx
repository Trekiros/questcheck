import { getUser } from "@/server/cache/users";
import { FC } from "react";
import styles from './page.module.scss'

const SettingsPage: FC<{}> = () => {
    const user = getUser()

    if (!user) {
        return (
            <div>
                <h1>Welcome to <span className={styles.logo}>Quest Check</span>, adventurer!</h1>
            </div>
        )
    }

    return (
        <></>
    )
}

export default SettingsPage