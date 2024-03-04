import { PlaytestSearchParams } from "@/model/playtest";
import { FC, useState } from "react";
import styles from './searchResults.module.scss'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { trpcClient } from "@/server/utils";
import { useRouter } from "next/router";
import Link from "next/link";

const SearchResults: FC<{ search: PlaytestSearchParams }> = ({ search }) => {
    const [page, setPage] = useState(0)
    const [perPage, setPerPage] = useState<10|25|50>(25)
    const playtestsQuery = trpcClient.playtests.search.useQuery({ search, page, perPage })
    const userInfoQuery = trpcClient.users.getSelf.useQuery()

    return (
        <div className={styles.results}>
            <section className={styles.header}>
                <h2>Recent TTRPG Playtest Offers</h2>
                
                { userInfoQuery.data?.isPublisher && (
                    (
                        userInfoQuery.data?.publisherProfile.twitterProof
                     || userInfoQuery.data?.publisherProfile.facebookProof
                     || userInfoQuery.data?.publisherProfile.manualProof
                    ) ? (
                        <Link href='/playtest/new'>
                            Create Playtest
                            <FontAwesomeIcon icon={faPlus}/>
                        </Link>
                    ) : (
                        <button className="tooltipContainer">
                            Create Playtest
                            <FontAwesomeIcon icon={faPlus}/>

                            <div className="tooltip left" style={{ background: "#322", cursor: 'initial' }}>
                                Please provide proof of identity in your <Link href='/settings'>user profile</Link> to create playtests.
                            </div>
                        </button>
                    )
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
                    playtestsQuery.data.map((playtest, i) => (
                        <div className={styles.playtest} key={i}>
            
                        </div>
                    ))
                )}
            </section>
        </div>
    )
}

export default SearchResults
