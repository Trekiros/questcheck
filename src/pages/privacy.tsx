import { FC } from "react";
import styles from './legal.module.scss'
import { NextSeo } from "next-seo";
import Page, { ServerSideProps } from "@/components/utils/page";
import { serverPropsGetter } from "@/components/utils/pageProps";

export const getServerSideProps = serverPropsGetter;

const PrivacyPolicy: FC<{} & ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <div className={styles.legal}>
                <NextSeo title="Privacy Policy" />

                <iframe title="Privacy Policy" src="/legal/privacy.html" />
            </div>
        </Page>
    )
}

export default PrivacyPolicy