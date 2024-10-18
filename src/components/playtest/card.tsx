
import { Playtest, PlaytestSummary } from "@/model/playtest";
import { FC } from "react";
import styles from './card.module.scss'
import { PublicUser, User } from "@/model/user";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faCheck, faClose, faEllipsis, faLock, faQuestionCircle, faShareFromSquare, faUsers } from "@fortawesome/free-solid-svg-icons";
import Markdown from "../utils/markdown";
import { tagClassName } from "./searchParams";
import { ContractPDF, generateContract } from "./edit/contract";
import { useUserCtx } from "../utils/page";
import { useUser } from "@clerk/nextjs";
import Expandable from "../utils/expandable";
import { Prettify } from "@/model/utils";
import { usePromisedMemo } from "@/model/hooks";

type PropType = {
    author: Prettify<Omit<PublicUser, "playerProfile"> & Pick<User, "emails">>,
    emails?: string[],
} & (
    { playtest: Playtest, summary?: undefined }
  | { summary: PlaytestSummary, playtest?: undefined }
)

const PlaytestCard: FC<PropType> = ({ author, playtest, summary, emails }) => {
    const userCtx = useUserCtx()
    const user = useUser()
    const common = playtest || summary

    const participants = !summary ? 0 : summary.applications.filter(({ status }) => status === 'accepted').length
    const applicants = !summary ? 0 : summary.applications.filter(({ status }) => status === 'pending').length

    const userApplication = summary?.applications.find(app => app.applicantId === userCtx?.userId)

    const contract = usePromisedMemo(
        async () => !playtest ? null : await generateContract(playtest, author, (!!userCtx && emails) ? { ...userCtx.user, emails } : undefined),
        [playtest, author, userCtx, emails],
    )

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
                    <label>Type:</label>
                    <span>{common.task}</span>

                    <label>Bounty:</label>
                    <span>{common.bounty}</span>

                    { !!common.maxPositions && (
                        <>
                            <label>Spots:</label>
                            <span>{common.maxPositions}</span>
                        </>
                    )}
                    { ((Date.now() < common.applicationDeadline) && (!common.closedManually)) && (
                       <>
                           <label>Open until:</label>
                           <span>{new Date(common.applicationDeadline).toDateString()}</span>
                       </>
                    )}
                    { ((playtest?.bountyContract.type === "template") && (playtest.bountyContract.templateValues["Deadline"])) && (
                        <>
                            <label>Due date:</label>
                            <span>{playtest.bountyContract.templateValues["Deadline"]}</span>
                        </>
                    )}
                    { !!common.tags.length && (
                        <>
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
                        </>
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
                            text={contract || ""} />
                    </>}
                </section>
            )}

            {!!playtest && !!author.userBio.length && (
                <section className={styles.authorBio}>
                    <h3>About the Publisher</h3>

                    <Markdown text={author.userBio} />
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
                        ) : (userApplication.status === 'rejected') ? (
                            <div><FontAwesomeIcon icon={faClose} /> Application Rejected</div>
                        ) : (
                            <div><FontAwesomeIcon icon={faClose} /> Application Cancelled</div>
                        )
                    )}
                </section>
            )}
        </li>
    )
}

export default PlaytestCard