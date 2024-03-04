import { FC } from "react";
import styles from './legal.module.scss'

const PrivacyPolicy: FC<{}> = () => {
    return (
        <div className={styles.legal}>
            <iframe title="Privacy Policy" src="/legal/privacy.html" />
        </div>
    )
}

export default PrivacyPolicy