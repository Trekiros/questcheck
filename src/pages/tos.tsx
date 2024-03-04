import { FC } from "react";
import styles from './legal.module.scss'

const TermsOfService: FC<{}> = () => {
    return (
        <div className={styles.legal}>
            <iframe title="Privacy Policy" src="/legal/tos.html" />
        </div>
    )
}

export default TermsOfService