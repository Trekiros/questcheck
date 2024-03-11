
import { PlaytestSummary } from "@/model/playtest";
import { FC } from "react";
import styles from './card.module.scss'
import { PublicUser } from "@/model/user";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faShareFromSquare } from "@fortawesome/free-solid-svg-icons";
import Markdown from "../utils/markdown";

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
                    <Link 
                        className={styles.author}
                        href={
                            playtest.author.publisherProfile.twitterProof
                        || playtest.author.publisherProfile.facebookProof
                        || playtest.author.publisherProfile.manualProof!
                        } 
                        target="_blank">
                            {playtest.author.userName}

                            <FontAwesomeIcon icon={
                                playtest.author.publisherProfile.twitterProof ? faTwitter
                                : playtest.author.publisherProfile.facebookProof ? faFacebook
                                : faShareFromSquare
                            } />
                    </Link>
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
                    { playtest.maxPositions && (
                        <div className={styles.row}>
                            <label>Max Playtesters:</label>
                            {playtest.maxPositions}
                        </div>
                    )}
                </div>

                <div className={styles.description}>
                    <Markdown text={playtest.description} />
                </div>
            </div>
        </li>
    )
}

export default PlaytestCard