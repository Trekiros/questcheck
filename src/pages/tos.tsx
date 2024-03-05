import { FC } from "react";
import styles from './legal.module.scss'
import { NextSeo } from "next-seo";

const TermsOfService: FC<{}> = () => {
    return (
        <div className={styles.legal}>
            <NextSeo title="Terms of Service" />

            <iframe title="Terms of Service" src="/legal/tos.html" />
        </div>
    )
}

export default TermsOfService