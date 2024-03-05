import { FC } from "react";
import styles from './legal.module.scss'
import { NextSeo } from "next-seo";

const PrivacyPolicy: FC<{}> = () => {
    return (
        <div className={styles.legal}>
            <NextSeo title="Privacy Policy" />

            <iframe title="Privacy Policy" src="/legal/privacy.html" />
        </div>
    )
}

export default PrivacyPolicy