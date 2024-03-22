import { PublicUser, User } from "@/model/user"
import { faChevronDown, faChevronUp, faComment, faStar, faThumbsUp } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { FC, useMemo, useState } from "react"
import styles from './review.module.scss'
import Expandable from "@/components/utils/expandable"
import Markdown from "@/components/utils/markdown"
import { useDialog } from "@/components/utils/dialog"
import { Playtest } from "@/model/playtest"
import MarkdownTextArea from "@/components/utils/markdownTextArea"
import { UserReview, UserReviewSchema } from "@/model/reviews"
import Checkbox from "@/components/utils/checkbox"

export const ReviewsDisplay: FC<{ user: PublicUser & { playerReviews: User["playerReviews"] }, reviewerNameById: {[userId: string]: string} }> = ({ user, reviewerNameById}) => {
    const [collapsed, setCollapsed] = useState(true)

    // Sort reviews by creation timestamp descending (= latest first)
    const sortedReviews = useMemo(() => {
        function sortReviews(review1: UserReview, review2: UserReview) {
            return review2.createdTimestamp - review1.createdTimestamp
        }

        return user.playerReviews.sort(sortReviews)
    }, [user.playerReviews])
    
    if (!user.playerReviews.length) return null
    
    return (
        <section className={styles.reviews}>
            <label>
                <FontAwesomeIcon icon={faComment} />

                Recent Reviews

                <span className={styles.percentage}>
                    ({100 * user.playerReviews.filter(review => review.endorsed).length / user.playerReviews.length}% endorsed)
                </span>

                { (user.playerReviews.length > 3) && (
                    <button onClick={() => setCollapsed(!collapsed)}>
                        <FontAwesomeIcon icon={collapsed ? faChevronDown : faChevronUp} />
                    </button>
                )}
            </label>

            <ul>
                { (collapsed ? user.playerReviews.slice(0, 3) : user.playerReviews).map((review, i) => (
                    <li key={i} className={styles.review}>
                        <div className={styles.header}>
                            <label>{reviewerNameById[review.byUserId]}</label>
                            
                            { review.endorsed && (
                                <FontAwesomeIcon icon={faThumbsUp} />
                            )}
                        </div>

                        <Expandable lines={2}>
                            <Markdown text={review.comment} />
                        </Expandable>

                    </li>
                ))}
            </ul>
        </section>
    )
}

export const ReviewForm: FC<{ disabled: boolean, playtest: Playtest, onSend: (value: Omit<UserReview, 'byUserId'|'createdTimestamp'>) => any }> = ({ disabled, playtest, onSend }) => {
    const [endorsed, setEndorsed] = useState(false)
    const [comment, setComment] = useState('')
    const { setDialog } = useDialog()

    return (
        <div className={styles.reviewForm}>
            <label>
                Your Rating:
            </label>

            <Checkbox
                disabled={disabled}
                className={styles.endorse}
                value={endorsed}
                onToggle={() => setEndorsed(!endorsed)}>
                    Endorse this playtester
                    <FontAwesomeIcon icon={faThumbsUp} />
            </Checkbox>
            
            <div className="tooltipContainer">
                <MarkdownTextArea 
                    disabled={disabled}
                    maxLength={UserReviewSchema.shape.comment.maxLength!}
                    placeholder="Comment (optional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)} />

                <div className={`tooltip ${styles.tooltip}`}>
                    <h3>Was this playtester's feedback:</h3>

                    <ul>
                        <li>Full of good questions?</li>
                        <li>Generous in quantity?</li>
                        <li>Frank and honest?</li>
                        <li>Respectful?</li>
                        <li>Timely?</li>
                    </ul>

                    <p>
                        Note: A playtester's role is to provide an outsider's perspective, not necessarily to provide constructive feedback.
                    </p>
                </div>
            </div>
            
            <button
                disabled={disabled || (!endorsed && !comment) || (comment.length > UserReviewSchema.shape.comment.maxLength!)}
                onClick={() => setDialog(
                    "Are you sure you want to send this review? This cannot be undone. You should only send the review after the end of the playtest.",
                    confirm => confirm && onSend({ duringPlaytestId: playtest._id, endorsed, comment })
                )}>
                    Send Review <FontAwesomeIcon icon={faComment} />
            </button>
        </div>
    )
}