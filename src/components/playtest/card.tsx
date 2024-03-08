
import { PlaytestSummary } from "@/model/playtest";
import { FC } from "react";
import styles from './card.module.scss'
import { PublicUser } from "@/model/user";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faShareFromSquare } from "@fortawesome/free-solid-svg-icons";

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
                        By 

                        <Link href={'/profile/' + playtest.author.userName}>
                            {playtest.author.userName}
                        </Link>

                        {
                            playtest.author.publisherProfile.twitterProof ? (
                                <Link href={'https://www.twitter.com/' + playtest.author.publisherProfile.twitterProof}>
                                    <FontAwesomeIcon icon={faTwitter} />
                                </Link>
                            ) : playtest.author.publisherProfile.facebookProof ? (
                                <Link href={'https://www.facebook.com/' + playtest.author.publisherProfile.facebookProof}>
                                    <FontAwesomeIcon icon={faFacebook} />
                                </Link>
                            ) : playtest.author.publisherProfile.manualProof ? (
                                <Link href={playtest.author.publisherProfile.manualProof}>
                                    <FontAwesomeIcon icon={faShareFromSquare} />
                                </Link>
                            ) : null
                        }
                    </div>
                )}
            </div>
        </li>
    )
}

export default PlaytestCard