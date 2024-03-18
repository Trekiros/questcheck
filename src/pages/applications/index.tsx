import { NextSeo } from 'next-seo'
import styles from './index.module.scss'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import { FC, useState } from 'react';
import { trpcClient } from '@/server/utils';
import PlaytestCard from '@/components/playtest/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export const getServerSideProps = serverPropsGetter;

const PlaytestListPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    const [page, setPage] = useState(0)
    const [perPage, setPerPage] = useState<10|25|50>(10)
    const searchQuery = trpcClient.playtests.search.useQuery({ page, perPage, search: {
        includesMe: true,
        includeClosed: true,
    }})
    const { count, playtests } = searchQuery.data || {}

    return (
        <Page userCtx={userCtx}>
            <div className={styles.playtestList}>
                <NextSeo title="My Playtests" />

                <h1>My Playtests</h1>

                <section className={styles.cards}>
                    { 
                        !playtests ? <div className={styles.placeholder}>Loading...</div>
                      : (playtests.length === 0) ? <div className={styles.placeholder}>
                            No playtests found - apply to a playtest and it will be displayed here!
                        </div>
                      : (
                        playtests.map(playtest => (
                            <PlaytestCard
                                key={playtest._id} 
                                author={playtest.author!} 
                                summary={playtest} />
                        ))
                      )
                    }
                </section>
                
                {  !!count && (count > perPage) && (
                    <section className={styles.page}>
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}>
                                <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <span>Page {page + 1} / {Math.ceil(count! / perPage)}</span>
                        <button
                            disabled={count! < perPage * (page + 1)}
                            onClick={() => setPage(page + 1)}>
                                <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </section>
                )}
            </div>
        </Page>
    )
}

export default PlaytestListPage