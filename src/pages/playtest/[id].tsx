import { NextSeo } from 'next-seo'
import styles from './[id].module.scss'
import { FC, useMemo, useState } from 'react'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { getAuth } from "@clerk/nextjs/server";
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import Markdown from '@/components/utils/markdown';
import PlaytestCard from '@/components/playtest/card';
import Checkbox from '@/components/utils/checkbox';
import { trpcClient } from '@/server/utils';
import { useDialog } from '@/components/utils/dialog';
import { useRouter } from 'next/router';
import { playtestById } from '@/server/routers/playtests';
import { ApplicationCard } from '@/components/playtest/details/application';

type DataType = Awaited<ReturnType<typeof playtestById>>
type PageProps = ServerSideProps & { initialData: DataType }

export const getServerSideProps: ServerSidePropsGetter<PageProps> = async (ctx) => {
    const playtestId = ctx.params?.id as string
    if (!playtestId) throw new Error('Internal Server Error')

    const userId = getAuth(ctx.req).userId;

    return {
        props: {
            ...(await serverPropsGetter(ctx)).props,
            initialData: await playtestById(playtestId, userId),
        }
    }
};

const PlaytestDetailsPage: FC<PageProps> = ({ userCtx, initialData }) => {
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

    const croppedName = useMemo(() => playtest.name.length > 20 ? (playtest.name.substring(0, 20) + "...") : playtest.name, [playtest.name])
    
    const userApplication = userCtx && playtest.applications.find(app => app.applicantId === userCtx.userId)
    const isCreator = (userCtx?.userId === playtest.userId)
    const isApplicant = !!userApplication
    const isAccepted = userApplication?.status === "accepted"
    
    const [agreed, setAgreed] = useState(isApplicant)
    const applyMutation = trpcClient.playtests.apply.useMutation()
    const acceptMutation = trpcClient.playtests.accept.useMutation()
    const rejectMutation = trpcClient.playtests.reject.useMutation()
    const closeMutation = trpcClient.playtests.close.useMutation()
    const reviewMutation = trpcClient.users.review.useMutation()
    const { setDialog } = useDialog()

    // If true, no action can be performed
    const disabled = !userCtx
        || queryResult.isFetching 
        || applyMutation.isLoading 
        || acceptMutation.isLoading
        || rejectMutation.isLoading
        || closeMutation.isLoading
        || reviewMutation.isLoading

    // If true, new applications cannot be added
    const applicationDisabled = 
           isApplicant
        || playtest.closedManually 
        || playtest.applicationDeadline < Date.now()

    return (
        <Page userCtx={userCtx}>
            <NextSeo title={croppedName} />

            <div className={styles.playtestDetails}>
                <PlaytestCard playtest={playtest} author={author} />

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

                        <p>If You send an application, the publisher will be shown your public player profile.</p>

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
                    <h3>Applications</h3>

                    { !applicants.length ? (
                        <div className={styles.placeholder}>
                            No applications yet...
                        </div>
                    ) : (
                        <ul>
                            { applicants.map(applicant => {
                                const application = playtest.applications.find(app => app.applicantId === applicant.userId)!

                                return (
                                    <ApplicationCard
                                        key={applicant.userId}

                                        playtest={playtest}
                                        applicant={applicant}
                                        application={application}
                                        isCreator={isCreator}
                                        disabled={disabled || applicationDisabled}
                                        
                                        onAccept={async () => {                
                                            await acceptMutation.mutateAsync({ playtestId: playtest._id, applicantId: applicant.userId })
                                            await refetch()
                                        }}
                                        onReject={async () => {
                                            await rejectMutation.mutateAsync({ playtestId: playtest._id, applicantId: applicant.userId })
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
                                )
                            })}
                        </ul>
                    )}
                </section>

                { /* CLOSE APPLICATIONS BTN */ }
                { isCreator && (
                    <button 
                        className={styles.closeBtn}
                        disabled={disabled || applicationDisabled}
                        onClick={() => setDialog("Are you sure? This cannot be undone.", async confirm => {
                            if (!confirm) return;
                            await closeMutation.mutateAsync(playtest._id)
                            await refetch()
                        })}>
                            { (playtest.closedManually || Date.now() > playtest.applicationDeadline)
                                ? "Applications Closed"
                                : "Close Applications"
                            }
                            <FontAwesomeIcon icon={faClose} />
                    </button>
                )}
            </div>
        </Page>
    )
}

export default PlaytestDetailsPage