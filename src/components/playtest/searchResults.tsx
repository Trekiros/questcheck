import { PlaytestSearchParams } from "@/model/playtest";
import { FC, useEffect, useState } from "react";
import styles from './searchResults.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { trpcClient } from "@/server/utils";
import Link from "next/link";
import PlaytestCard from "./card";
import { useUserCtx } from "../utils/page";

const SearchResults: FC<{ search: PlaytestSearchParams }> = ({ search }) => {
    const [page, setPage] = useState(0)
    const [perPage, setPerPage] = useState<10|25|50>(25)
    const userCtx = useUserCtx()

    // Only send up to 1 query every 1 seconds
    const [throttledSearch, setSearch] = useState(search)
    useEffect(() => {
        if (JSON.stringify(search) === JSON.stringify(throttledSearch)) return;

        const timeout = setTimeout(() => setSearch(search), 2000)

        return () => clearTimeout(timeout)
    }, [search])

    const playtestsQuery = trpcClient.playtests.search.useQuery({ search: throttledSearch, page, perPage })
    const { playtests, count } = playtestsQuery.data || {}

    return (
        <div className={styles.results}>
            <section className={styles.header}>
                <h1>Recent TTRPG Playtest Offers</h1>
                
                { !!userCtx?.permissions.canCreate && (
                    <Link href='/playtest/new'>
                        Create Playtest
                        <FontAwesomeIcon icon={faPlus}/>
                    </Link>
                )}
            </section>


            <section className={styles.list}>
                { !playtests ? (
                    <div className={styles.placeholder}>
                        Loading...
                    </div>
                ) : !playtests.length ? (
                    <div className={styles.placeholder}>
                        No results found. Try broadening your search parameters.
                    </div>
                ) : (
                    <ul>
                        {playtests.map((result, i) => {
                            const { author, ...summary } = result

                            return (
                                <PlaytestCard key={summary._id} summary={summary} author={author!} />
                            )
                        })}
                    </ul>
                )}
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
    )
}

export default SearchResults
