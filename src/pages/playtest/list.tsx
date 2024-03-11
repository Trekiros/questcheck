import { NextSeo } from 'next-seo'
import styles from './list.module.scss'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import { FC } from 'react';

export const getServerSideProps = serverPropsGetter;

const PlaytestListPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <div className={styles.playtestList}>
                <NextSeo title="My Playtests" />

            </div>
        </Page>
    )
}

export default PlaytestListPage