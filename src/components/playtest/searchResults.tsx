import { PlaytestSearchParams } from "@/model/playtest";
import { FC, useEffect, useState } from "react";
import styles from './searchResults.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
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
        const timeout = setTimeout(() => setSearch(search), 2000)

        return () => clearTimeout(timeout)
    }, [search])

    const playtestsQuery = trpcClient.playtests.search.useQuery({ search: throttledSearch, page, perPage })

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
                { !playtestsQuery.data ? (
                    <div className={styles.placeholder}>
                        Loading...
                    </div>
                ) : !playtestsQuery.data.length ? (
                    <div className={styles.placeholder}>
                        No results found. Try broadening your search parameters.
                    </div>
                ) : (
                    <ul>
                        {playtestsQuery.data.map((playtest, i) => (
                            <PlaytestCard key={playtest._id} playtest={playtest} />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

export default SearchResults
