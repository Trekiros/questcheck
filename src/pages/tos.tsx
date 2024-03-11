import { FC } from "react";
import styles from './legal.module.scss'
import { NextSeo } from "next-seo";
import Page, { ServerSideProps } from "@/components/utils/page";
import { serverPropsGetter } from "@/components/utils/pageProps";

export const getServerSideProps = serverPropsGetter;

const TermsOfService: FC<{} & ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <div className={styles.legal}>
                <NextSeo title="Terms of Service" />

                <iframe title="Terms of Service" src="/legal/tos.html" />
            </div>
        </Page>
    )
}

export default TermsOfService