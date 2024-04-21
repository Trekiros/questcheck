import { NextSeo } from 'next-seo'
import styles from './[id].module.scss'
import { FC, useMemo, useState } from 'react'
import Page, { ServerSideProps } from '@/components/utils/page'
import { getUserCtx } from '@/components/utils/pageProps'
import { getAuth, buildClerkProps } from "@clerk/nextjs/server"
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft, faCheck, faClose, faFile } from '@fortawesome/free-solid-svg-icons';
import Markdown from '@/components/utils/markdown';
import PlaytestCard from '@/components/playtest/card';
import Checkbox from '@/components/utils/checkbox';
import { trpcClient } from '@/server/utils';
import { useDialog } from '@/components/utils/dialog';
import { useRouter } from 'next/router';
import { playtestById } from '@/server/routers/playtests';
import { ApplicationCard } from '@/components/playtest/details/application';
import { toast } from 'sonner'
import Modal from '@/components/utils/modal'
import Calendar from '@/components/utils/calendar'

type DataType = Awaited<ReturnType<typeof playtestById>>
type PageProps = ServerSideProps & { 
    initialData: DataType,
    emails: string[]
}

export const getServerSideProps: ServerSidePropsGetter<PageProps> = async (ctx) => {
    const playtestId = ctx.params?.id as string
    if (!playtestId) throw new Error('Internal Server Error')
    const userId = getAuth(ctx.req).userId;

    let emails: string[] = []
    const userCtx = await getUserCtx(userId, { userCallback: (user) => { emails = user.emails } })

    return {
        props: {
            ...buildClerkProps(ctx.req),
            userCtx,
            initialData: await playtestById(playtestId, userId),
            emails,
        }
    }
};

const PlaytestDetailsPage: FC<PageProps> = ({ userCtx, initialData, emails }) => {
    const router = useRouter()

    // We use the data from getServerSideProps until a mutation is invoked, then we switch to the trpc query (by calling refetch)
    // That way, the data is available on page load without extra wait times, but can be updated without refreshing the page
    // TODO: turn this into a custom hook called useInitializedQuery(useQueryFn, useQueryParams, initialData) => [data, refetch, isLoading]
    const queryResult = trpcClient.playtests.find.useQuery(String(router.query.id), { enabled: false })
    const [{ playtest, author, applicants, reviewerNameById }, setState] = useState(initialData)
    async function refetch() {
        const { data } = await queryResult.refetch()
        setState(data!)
    }

    const applicationList = useMemo(
        () => playtest.applications
            .filter(app => app.status !== "cancelled")
            .map(application => ({ application, applicant: applicants.find(applicant => applicant.userId === application.applicantId)!})),
        [playtest, applicants]
    )

    const croppedName = useMemo(() => playtest.name.length > 20 ? (playtest.name.substring(0, 20) + "...") : playtest.name, [playtest.name])
    
    const userApplication = userCtx && playtest.applications.find(app => app.applicantId === userCtx.userId)
    const isCreator = (userCtx?.userId === playtest.userId)
    const isApplicant = !!userApplication
    const isAccepted = userApplication?.status === "accepted"
    
    const [agreed, setAgreed] = useState(isApplicant)
    const [showTimePicker, setShowTimePicker] = useState(false)
    const applyMutation = trpcClient.playtests.apply.useMutation()
    const cancelMutation = trpcClient.playtests.cancelApplication.useMutation()
    const acceptMutation = trpcClient.playtests.accept.useMutation()
    const rejectMutation = trpcClient.playtests.reject.useMutation()
    const closeMutation = trpcClient.playtests.close.useMutation()
    const reopenMutation = trpcClient.playtests.reopen.useMutation()
    const rescheduleMutation = trpcClient.playtests.reschedule.useMutation()
    const reviewMutation = trpcClient.users.review.useMutation()
    const { setDialog } = useDialog()

    // If true, no action can be performed
    const disabled = !userCtx
        || queryResult.isFetching 
        || applyMutation.isLoading 
        || acceptMutation.isLoading
        || rejectMutation.isLoading
        || closeMutation.isLoading
        || reopenMutation.isLoading
        || rescheduleMutation.isLoading
        || reviewMutation.isLoading
        || cancelMutation.isLoading

    // If true, new applications cannot be added
    const applicationDisabled = 
           isApplicant
        || playtest.closedManually 
        || playtest.applicationDeadline < Date.now()

    function csvExport() {
        function format(...args: string[]) {
            return args.map(arg => `"${(arg || '').replace(/"/g, '""')}"`).join(",")
        }

        const header = format("Username", "Email", "Credit as") + '\r\n'

        const body = playtest.applications
            .filter(app => (app.status === "accepted"))
            .map(app => applicants.find(applicant => applicant.userId === app.applicantId)!)
            .map(app => format(app.userName, app.emails[0], app.playerProfile.creditName || app.userName))
            .join("\r\n")

        const csv = header + body
        const csvBlob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(csvBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${playtest.name} - playtesters.csv`
        link.click()
    }

    return (
        <Page userCtx={userCtx}>
            <NextSeo title={croppedName} />

            <div className={styles.playtestDetails}>
                <PlaytestCard playtest={playtest} author={author} emails={emails} />

                {/* SECRET INFO ONLY VISIBLE TO THE CREATOR & PLAYTESTERS */ }
                { (isCreator || isAccepted) && (
                    <section className={`${styles.secret} tooltipContainer`}>
                        <h3>Playtester Info</h3>

                        <Markdown text={playtest.privateDescription} />

                        <Link target="_blank" href={playtest.feedbackURL}>Playtest Survey</Link>

                        { isCreator && (
                            <div className='tooltip' style={{ background: "#211" }}>
                                This section is only visible to playtesters whose application you have accepted.
                            </div>
                        )}
                    </section>
                )}

                { /* APPLICATION FORM */ }
                { !isCreator && !!userCtx && (
                    <section className={styles.applicationForm}>
                        <h3>Send Application</h3>

                        <p>
                            If You send an application, the publisher will be shown your public player profile. This includes: 
                            your username, email address, user bio, known systems, and recent reviews from other publishers.
                        </p>

                        <Checkbox 
                            className={styles.agreeBtn}
                            disabled={disabled || applicationDisabled}
                            value={agreed} 
                            onToggle={() => setAgreed(!agreed)}>
                                I agree to the terms above
                        </Checkbox>

                        <button 
                            disabled={!agreed || disabled || applicationDisabled} 
                            onClick={() => setDialog(
                                "Are you sure you wish to apply to this playtest? This cannot be undone.", 
                                async result => {
                                    if (!result) return;
                                    await applyMutation.mutateAsync(playtest._id)
                                    await refetch()
                                }
                            )}>
                                { isApplicant ? "You have applied!" : "Apply" }
                        </button>
                    </section>
                )}

                { /* APPLICATIONS LIST */ }
                <section className={styles.applications}>
                    <h3>
                        Applications

                        { !!playtest.applications.filter(app => app.status === "accepted").length && (
                            <button onClick={csvExport}>
                                <FontAwesomeIcon icon={faFile} />
                                Download Playtester Recap
                            </button>
                        )}
                    </h3>

                    { !applicationList.length ? (
                        <div className={styles.placeholder}>
                            No applications yet...
                        </div>
                    ) : (
                        <ul>
                            { applicationList.map(({ applicant, application }) => (
                                <ApplicationCard
                                    key={applicant.userId}

                                    playtest={playtest}
                                    applicant={applicant}
                                    application={application}
                                    isCreator={isCreator}
                                    emails={emails}
                                    disabled={disabled}
                                    
                                    onAccept={async () => {                
                                        await acceptMutation.mutateAsync({ playtestId: playtest._id, applicantId: applicant.userId })
                                        await refetch()
                                    }}
                                    onReject={async () => {
                                        await rejectMutation.mutateAsync({ playtestId: playtest._id, applicantId: applicant.userId })
                                        await refetch()
                                    }}
                                    onCancel={async () => {
                                        await cancelMutation.mutateAsync(playtest._id)
                                        await refetch()
                                    }}
                                    onReview={async review => {
                                        await reviewMutation.mutateAsync({
                                            playtesterId: applicant.userId,
                                            review,
                                        })
                                        await refetch()
                                    }}
                                    
                                    reviewerNameById={reviewerNameById}
                                />
                            ))}
                        </ul>
                    )}
                </section>

                { /* CLOSE APPLICATIONS BTN */ }
                { isCreator && (
                    (playtest.closedManually) ? (
                        <button
                            className={styles.closeBtn}
                            disabled={disabled}
                            onClick={async () => {
                                await reopenMutation.mutateAsync(playtest._id)
                                await refetch()
                                toast("Applications re-opened")
                            }}>
                                Re-open applications
                                <FontAwesomeIcon icon={faArrowRotateLeft} />
                        </button>
                    ) : (Date.now() > playtest.applicationDeadline) ? (
                        <button
                            className={styles.closeBtn}
                            disabled={disabled}
                            onClick={() => setShowTimePicker(true)}>
                                Set new Application Deadline
                                <FontAwesomeIcon icon={faArrowRotateLeft} />
                        </button>
                    ) : (
                        <button
                            className={styles.closeBtn}
                            disabled={disabled}
                            onClick={async () => {
                                await closeMutation.mutateAsync(playtest._id)
                                await refetch()
                                toast("Applications closed manually")
                            }}>
                                Close applications
                                <FontAwesomeIcon icon={faClose} />
                        </button>
                    )
                )}
            </div>

            { showTimePicker && (
                <TimePickerModal
                    onCancel={() => setShowTimePicker(false)}
                    onSubmit={async (newDeadline) => {
                        setShowTimePicker(false)
                        await rescheduleMutation.mutateAsync({ playtestId: playtest._id, newDeadline })
                        await refetch()
                        toast("Applications re-opened until " + new Date(newDeadline).toDateString())
                    }} />
            )}
        </Page>
    )
}

const TimePickerModal: FC<{ onCancel: () => void, onSubmit: (newDeadline: number) => void }> = ({ onCancel, onSubmit }) => {
    const [time, setTime] = useState(Date.now() + 1000 * 60 * 60 * 25)

    return (
        <Modal onCancel={onCancel} className={styles.timeModal}>
            <h3>New Application Deadline</h3>
            
            <p>Note: re-opening applications will allow the playtest to show up on the home page again, but won't send notifications to playtesters.</p>

            <div className={styles.row}>
                <label>New Deadline:</label>

                <Calendar
                    value={time}
                    onChange={newValue => newValue && setTime(newValue)}
                    min={Date.now() + 1000 * 60 * 60 * 24}
                    placeholder="Applications must remain open at least 2 days..."/>
            </div>

            <div className={styles.actions}>
                <button onClick={onCancel}>
                    <FontAwesomeIcon icon={faClose} />
                    Cancel
                </button>
                <button onClick={() => onSubmit(time)}>
                    <FontAwesomeIcon icon={faCheck} />
                    OK
                </button>
            </div>
        </Modal>
    )
}

export default PlaytestDetailsPage