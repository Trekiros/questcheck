
import { Playtest, PlaytestSummary } from "@/model/playtest";
import { FC } from "react";
import styles from './card.module.scss'
import { PublicUser } from "@/model/user";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faCheck, faClose, faEllipsis, faLock, faQuestionCircle, faShareFromSquare, faUsers } from "@fortawesome/free-solid-svg-icons";
import Markdown from "../utils/markdown";
import { tagClassName } from "./searchParams";
import { ContractPDF, generateContract } from "./edit/contract";
import { useUserCtx } from "../utils/page";
import { useUser } from "@clerk/nextjs";
import { keys } from "@/model/utils";
import Expandable from "../utils/expandable";

type PropType = {
    author: PublicUser,
} & (
    { playtest: Playtest, summary?: undefined }
  | { summary: PlaytestSummary, playtest?: undefined }
)

const PlaytestCard: FC<PropType> = ({ author, playtest, summary }) => {
    const userCtx = useUserCtx()
    const user = useUser()
    const common = playtest || summary

    const participants = !summary ? 0 : summary.applications.filter(({ status }) => status === 'accepted').length
    const applicants = !summary ? 0 : summary.applications.filter(({ status }) => status === 'pending').length

    const userApplication = summary?.applications.find(app => app.applicantId === userCtx?.userId)

    return (
        <li className={`${styles.playtest} ${!playtest && styles.summary}`}>
            <section className={styles.header}>
                { !!summary ? (
                    <Link 
                        title={summary.name}
                        href={'/playtest/' + summary._id}
                        className={styles.name}>
                            {summary.name}
                    </Link>
                ) : (
                    <h1>{playtest.name}</h1>
                )}
                
                { author && (
                    <div className={styles.author}>
                        <Link
                            href={
                                author.publisherProfile.twitterProof ? `https://twitter.com/${author.publisherProfile.twitterProof}`
                              : author.publisherProfile.youtubeProof ? `https://www.youtube.com/channel/${author.publisherProfile.youtubeProof}`
                              : author.publisherProfile.manualProof!
                            } 
                            target="_blank">
                                {author.userName}

                                <FontAwesomeIcon icon={
                                    author.publisherProfile.twitterProof ? faTwitter
                                    : author.publisherProfile.youtubeProof ? faYoutube
                                    : faShareFromSquare
                                } />
                        </Link>
                    </div>
                )}
            </section>

            <section className={styles.body}>
                <div className={styles.stakes}>
                    <div className={styles.row}>
                        <label>Type:</label>
                        {common.task}
                    </div>
                    <div className={styles.row}>
                        <label>Bounty:</label>
                        {common.bounty}
                    </div>
                    { !!common.maxPositions && (
                        <div className={styles.row}>
                            <label>Spots:</label>
                            {common.maxPositions}
                        </div>
                    )}
                    { !!common.tags.length && (
                        <div className={styles.row}>
                            <label>Tags:</label>
                            <div className={styles.tags}>
                                {common.tags.map(tag => (
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
                    { summary ? (
                        <Expandable lines={3}><Markdown text={summary.description} /></Expandable>
                    ) : (
                        <Markdown text={playtest.description} />
                    )}
                    
                </div>

            </section>

            {!!playtest && !!author.userBio.length && (
                <section className={styles.authorBio}>
                    <h3>About the Publisher</h3>

                    <Markdown text={author.userBio} />
                </section>
            )}

            { !!playtest && (
                <section className={styles.bountyDetails}>
                    { !!playtest.bountyDetails && <>
                        <h3>Bounty Details</h3>

                        <Markdown text={common.bountyDetails} />
                    </>}

                    { (!!user.user) && (playtest.userId !== user.user?.id) && <>
                        <hr />

                        <h3>Playtest Agreement</h3>

                        By submitting an application to this playtest, you agree that if the publisher accepts your application, 
                        the following agreement will come into effect.

                        <p>
                            Important Note:<br />
                            The contract you end up signing with the publisher is what will arbitrate your relationship with the publisher.
                            Quest Check only exists to facilitate your meeting with publishers, not to moderate it.
                            By applying to a playtest on this website, you agree that Quest Check is not your lawyer, does not provide legal advice, 
                            and will not be held accountable for any legal dispute between you and the publisher related to this playtest.
                        </p>

                        <ContractPDF 
                            playtest={playtest} 
                            user={author} 
                            text={generateContract(playtest, author, userCtx?.user)} />
                    </>}
                </section>
            )}

            { !!summary && (
                <section className={styles.summary}>
                    {
                        summary.closedManually ? <div className={styles.closed}><FontAwesomeIcon icon={faLock}/> Closed Manually</div> 
                      : (summary.applicationDeadline < Date.now()) && <div className={styles.closed}><FontAwesomeIcon icon={faLock}/> Applications closed</div>
                    }

                    { !!participants && (
                        <div><FontAwesomeIcon icon={faUsers} /> Participants: {participants}</div>
                    )}
                    { !!applicants && (
                        <div><FontAwesomeIcon icon={faQuestionCircle} /> Open Applications: {applicants}</div>
                    )}

                    { !!userApplication && (
                        (userApplication.status === 'pending') ? (
                            <div><FontAwesomeIcon icon={faEllipsis} /> You have applied!</div>
                        ) : (userApplication.status === 'accepted') ? (
                            <div><FontAwesomeIcon icon={faCheck} /> You are a participant!</div>
                        ):(
                            <div><FontAwesomeIcon icon={faClose} /> Application Rejected</div>
                        )
                    )}
                </section>
            )}
        </li>
    )
}

export default PlaytestCard