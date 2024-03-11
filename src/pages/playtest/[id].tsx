import { NextSeo } from 'next-seo'
import styles from './[id].module.scss'
import { FC } from 'react'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';

export const getServerSideProps = serverPropsGetter;

const PlaytestDetailsPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <div className={styles.playtestDetails}>
                <NextSeo title="Playtest" />

            </div>
        </Page>
    )
}

export default PlaytestDetailsPage