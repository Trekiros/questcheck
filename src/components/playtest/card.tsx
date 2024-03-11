
import { PlaytestSummary } from "@/model/playtest";
import { FC } from "react";
import styles from './card.module.scss'
import { PublicUser } from "@/model/user";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faShareFromSquare } from "@fortawesome/free-solid-svg-icons";
import Markdown from "../utils/markdown";
import { tagClassName } from "./searchParams";

const PlaytestCard: FC<{ playtest: PlaytestSummary & { author?: PublicUser} }> = ({ playtest }) => {
    return (
        <li className={styles.playtest}>
            <div className={styles.header}>
                <Link 
                    title={playtest.name}
                    href={'/playtest/' + playtest._id}
                    className={styles.name}>
                        {playtest.name}
                </Link>
                
                { playtest.author && (
                    <div className={styles.author}>
                        <Link
                            href={
                                playtest.author.publisherProfile.twitterProof ? `https://twitter.com/${playtest.author.publisherProfile.twitterProof}`
                              : playtest.author.publisherProfile.facebookProof ? `https://www.facebook.com/${playtest.author.publisherProfile.facebookProof}`
                              : playtest.author.publisherProfile.manualProof!
                            } 
                            target="_blank">
                                {playtest.author.userName}

                                <FontAwesomeIcon icon={
                                    playtest.author.publisherProfile.twitterProof ? faTwitter
                                    : playtest.author.publisherProfile.facebookProof ? faFacebook
                                    : faShareFromSquare
                                } />
                        </Link>
                    </div>
                )}
            </div>

            <div className={styles.body}>
                <div className={styles.stakes}>
                    <div className={styles.row}>
                        <label>Type:</label>
                        {playtest.task}
                    </div>
                    <div className={styles.row}>
                        <label>Bounty:</label>
                        {playtest.bounty}
                    </div>
                    { !!playtest.maxPositions && (
                        <div className={styles.row}>
                            <label>Spots:</label>
                            {playtest.maxPositions}
                        </div>
                    )}
                    { !!playtest.tags.length && (
                        <div className={styles.row}>
                            <label>Tags:</label>
                            <div className={styles.tags}>
                                {playtest.tags.map(tag => (
                                    <span 
                                        key={tag} 
                                        className={tagClassName(tag)}>
                                            {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) }
                </div>

                <div className={styles.description}>
                    <Markdown text={playtest.description} />
                </div>
            </div>
        </li>
    )
}

export default PlaytestCard