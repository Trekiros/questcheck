import { NextSeo } from 'next-seo'
import styles from './index.module.scss'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import { FC, useState } from 'react';
import { trpcClient } from '@/server/utils';
import PlaytestCard from '@/components/playtest/card';
import Link from 'next/link';

export const getServerSideProps = serverPropsGetter;

const PlaytestListPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    const [page, setPage] = useState(0)
    const [perPage, setPerPage] = useState<10|25|50>(10)
    const searchQuery = trpcClient.playtests.search.useQuery({ page, perPage, search: {
        includeAuthors: [userCtx!.userId],
        includeClosed: true,
    }})

    return (
        <Page userCtx={userCtx}>
            <div className={styles.playtestList}>
                <NextSeo title="My Playtests" />

                <h1>My Playtests</h1>

                <section className={styles.cards}>
                    { 
                        !searchQuery.data ? <div className={styles.placeholder}>Loading...</div>
                      : (searchQuery.data.length === 0) ? <div className={styles.placeholder}>
                            No playtests found.
                            <Link href='/playtest/new'>Create new playtest!</Link>
                        </div>
                      : (
                        searchQuery.data.map(playtest => (
                            <PlaytestCard
                                key={playtest._id} 
                                author={{ userId: userCtx!.userId, ...userCtx!.user! }} 
                                summary={playtest} />
                        ))
                      )
                    }
                </section>
            </div>
        </Page>
    )
}

export default PlaytestListPage