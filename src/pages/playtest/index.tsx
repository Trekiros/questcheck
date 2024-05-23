import { NextSeo } from 'next-seo'
import styles from './index.module.scss'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import { FC, useEffect, useState } from 'react';
import { trpcClient } from '@/server/utils';
import PlaytestCard from '@/components/playtest/card';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'

// This page is for publisher accounts only!
export const getServerSideProps: ServerSidePropsGetter<ServerSideProps> = async (ctx) => {
    const props = await serverPropsGetter(ctx)
    if (!props.props.userCtx?.user.isPublisher) return { redirect: { destination: '/', permanent: false } }

    return props
}

const PlaytestListPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    const [page, setPage] = useState(0)
    const [perPage, setPerPage] = useState<10|25|50>(10)
    const searchQuery = trpcClient.playtests.search.useQuery({ page, perPage, search: {
        includeAuthors: [userCtx!.userId],
        includeClosed: true,
    }})
    const { count, playtests } = searchQuery.data || {}

    return (
        <Page userCtx={userCtx}>
            <div className={`${styles.playtestList} page-content`}>
                <NextSeo title="My Playtests" />

                <h1>My Playtests</h1>

                <section className={styles.cards}>
                    { 
                        !playtests ? <div className={styles.placeholder}>Loading...</div>
                      : (playtests.length === 0) ? <div className={styles.placeholder}>
                            No playtests found.
                            <Link href='/playtest/new'>Create new playtest!</Link>
                        </div>
                      : (
                        playtests.map(playtest => (
                            <PlaytestCard
                                key={playtest._id} 
                                author={{ userId: userCtx!.userId, ...userCtx!.user!, emails: [] }} 
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