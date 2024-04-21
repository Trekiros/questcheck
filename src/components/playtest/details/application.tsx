import { Playtest } from "@/model/playtest";
import { UserReview } from "@/model/reviews";
import { FC } from "react";
import styles from './application.module.scss'
import { PublicUser, User } from "@/model/user";
import Expandable from "@/components/utils/expandable";
import Markdown from "@/components/utils/markdown";
import { SystemsDisplay } from "./system";
import { ReviewForm, ReviewsDisplay } from "./review";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFile } from "@fortawesome/free-solid-svg-icons";
import { ContractPDF, generateContract } from "../edit/contract";
import { useDialog } from "@/components/utils/dialog";
import { useUserCtx } from "@/components/utils/page";
import { usePromisedMemo } from "@/model/hooks";
import { trpcClient } from "@/server/utils";

type PropType = {
    playtest: Playtest,
    application: Playtest['applications'][number],
    applicant: PublicUser & { playerReviews: User["playerReviews"], emails: User["emails"] },
    isCreator: boolean,
    emails: User["emails"],
    disabled: boolean,
    onAccept: () => any,
    onReject: () => any,
    onCancel: () => any,
    onReview: (review: Omit<UserReview, 'byUserId'|'createdTimestamp'>) => any,
    reviewerNameById: {[key: string]: string},
}

export const ApplicationCard: FC<PropType> = ({ playtest, application, applicant, isCreator, emails, disabled, onAccept, onReject, onCancel, onReview, reviewerNameById }) => {
    const { setDialog } = useDialog()
    const userCtx = useUserCtx()

    const canReview = isCreator
        && application.status === 'accepted' 
        && !applicant.playerReviews.find(review => 
            (review.byUserId === userCtx?.userId)
            && (review.duringPlaytestId === playtest._id))

    const isApplicant = (userCtx?.userId === application.applicantId) && (application.status === 'pending')

    const contract = usePromisedMemo(
        async () => !userCtx ? null : await generateContract(playtest, { ...userCtx.user, emails }, applicant),
        [playtest, userCtx, emails, applicant],
    )

    return (
        <li className={styles.application}>
            <label className={styles.userName}>
                {applicant.userName}
                
                { (application.status === "accepted") && (
                    <div className={styles.isParticipant}>
                        <FontAwesomeIcon icon={faCheck} />
                        { applicant.userName } is a participant!
                    </div>
                )}
            </label>
            
            { !!applicant.userBio.length && (
                <section>
                    Bio:
                    <Expandable lines={3}>
                        <Markdown text={applicant.userBio} />
                    </Expandable>
                </section>
            )}

            { /* SYSTEMS & REVIEWS */ }
            <div className={styles.userInfo}>
                <SystemsDisplay user={applicant} playtest={playtest} />

                { (canReview || !!applicant.playerReviews.length) && (
                    <div className={styles.reviews}>
                        <ReviewsDisplay
                            reviews={applicant.playerReviews.map(review => ({ ...review, author: reviewerNameById[review.byUserId] }))} />

                        { canReview && <>
                                <hr />

                                <ReviewForm
                                    disabled={disabled} 
                                    playtest={playtest} 
                                    onSend={onReview}/>
                        </> }
                    </div>
                ) }
            </div>

            { isCreator && (
                (application.status === "accepted") ? (
                    <div className={styles.downloadBtn}>
                        <h3>You have accepted this application</h3>
                        <button onClick={() => setDialog(<div style={{ width: '600px' }}>
                            <ContractPDF
                                playtest={playtest}
                                user={userCtx!.user}
                                text={contract || ""}/>
                        </div>, () => {})}>
                            Download Agreement
                            <FontAwesomeIcon icon={faFile} />
                        </button>
                    </div>
                ) : (
                    <section className={styles.actions}>
                        <button disabled={disabled} onClick={() => setDialog(<div className={styles.acceptDialog}>
                            <h3>Confirm</h3>

                            Are you sure? By Accepting this application, you agree to the following terms. 
                            You should download this PDF and keep a copy of it (you can also download it later).

                            <ContractPDF
                                playtest={playtest}
                                user={userCtx!.user}
                                text={contract || ""}/>
                        </div>, confirm => confirm && onAccept())}>
                                Accept
                        </button>
                        <button disabled={disabled} onClick={() => setDialog(
                            "Are you sure you want to reject this application? This cannot be undone.",
                            confirm => confirm && onReject())}>
                                Reject
                        </button>
                    </section>
                )
            )}

            { isApplicant && (
                <section className={styles.actions}>
                    <button onClick={() => setDialog(
                        "Are you sure you want to cancel your application? You will not be able to apply to this playtest again.",
                        confirm => confirm && onCancel()
                    )}>
                        Cancel my application
                    </button>
                </section>
            )}
        </li>
    )
}
