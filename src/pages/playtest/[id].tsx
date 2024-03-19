import { NextSeo } from 'next-seo'
import styles from './[id].module.scss'
import { FC, useMemo, useState } from 'react'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { Playtest } from '@/model/playtest';
import { getAuth } from "@clerk/nextjs/server";
import { PublicUser, SystemFamiliarityList, User } from '@/model/user';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faChevronDown, faChevronUp, faClose, faFile, faStar } from '@fortawesome/free-solid-svg-icons';
import Markdown from '@/components/utils/markdown';
import PlaytestCard from '@/components/playtest/card';
import Checkbox from '@/components/utils/checkbox';
import { trpcClient } from '@/server/utils';
import { useDialog } from '@/components/utils/dialog';
import { useRouter } from 'next/router';
import { ContractPDF, generateContract } from '@/components/playtest/edit/contract';
import { playtestById } from '@/server/routers/playtests';

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
    const { setDialog } = useDialog()

    // If true, no action can be performed
    const disabled = !userCtx
        || queryResult.isFetching 
        || applyMutation.isLoading 
        || acceptMutation.isLoading
        || rejectMutation.isLoading
        || closeMutation.isLoading

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
                                    <li key={applicant.userId} className={styles.application}>
                                        <label className={styles.userName}>
                                            {applicant.userName}
                                        </label>
                                        
                                        { !!applicant.userBio.length && (
                                            <section>
                                                Bio:
                                                <Markdown text={applicant.userBio} />
                                            </section>
                                        )}

                                        <SystemsDisplay user={applicant} playtest={playtest} />

                                        { (playtest.applications.find(app => app.applicantId === applicant.userId)?.status === "accepted") && (
                                            <div className={styles.isParticipant}>
                                                <FontAwesomeIcon icon={faCheck} />
                                                { applicant.userName } is a participant!
                                            </div>
                                        )}

                                        { isCreator && (
                                            <section className={styles.actions}>
                                                { (application.status === "accepted") ? <>
                                                    <h3>You have accepted this application</h3>
                                                    <button disabled={disabled} onClick={() => setDialog(<div style={{ width: '600px' }}>
                                                        <ContractPDF
                                                            playtest={playtest}
                                                            user={userCtx.user}
                                                            text={generateContract(playtest, userCtx.user, applicant)}/>
                                                    </div>, () => {})}>
                                                        Download Agreement
                                                        <FontAwesomeIcon icon={faFile} />
                                                    </button>
                                                </> : <>
                                                    <button disabled={disabled} onClick={() => setDialog(<div className={styles.acceptDialog}>
                                                        <h3>Confirm</h3>

                                                        Are you sure? By Accepting this application, you agree to the following terms. 
                                                        You should download this PDF and keep a copy of it (you can also download it later).

                                                        <ContractPDF
                                                            playtest={playtest}
                                                            user={userCtx.user}
                                                            text={generateContract(playtest, userCtx.user, applicant)}/>
                                                    </div>, async result => {
                                                        if (!result) return;
                                                        await acceptMutation.mutateAsync({ playtestId: playtest._id, applicantId: applicant.userId })
                                                        await refetch()
                                                    })}>
                                                        Accept
                                                    </button>
                                                    <button onClick={() => setDialog(
                                                        "Are you sure you want to reject this application? This cannot be undone.",
                                                        async confirm => {
                                                            if (!confirm) return;
                                                            await rejectMutation.mutateAsync({ playtestId: playtest._id, applicantId: applicant.userId })
                                                            await refetch()
                                                        }
                                                    )}>
                                                        Reject
                                                    </button>
                                                </>}
                                            </section>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                </section>

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

const SystemsDisplay: FC<{ user: PublicUser, playtest: Playtest }> = ({ user, playtest }) => {
    const [collapsed, setCollapsed] = useState(true)
    const sortedSystems = useMemo(() => {
        // Sort systems known by the applicants, so that the ones useful for the playtest appear first.
        const systemsList = playtest.tags.filter(t => t.startsWith('Game: ')).map(t => t.substring('Game: '.length))
        type System = User['playerProfile']['systems'][number]
        function sortSystems(system1: System, system2: System) {
            const system1IsUseful = systemsList.includes(system1.system)
            const system2IsUseful = systemsList.includes(system2.system)

            if (system1IsUseful && system2IsUseful) return 0

            if (system1IsUseful) return -1
            if (system2IsUseful) return 1

            return 0
        }

        return user.playerProfile.systems.sort(sortSystems)
    }, [playtest.tags, user.playerProfile.systems])
    
    if (!user.playerProfile.systems.length) return null;

    return (
        <section className={styles.systems}>
            <label>
                Systems known

                { (sortedSystems.length > 3) && (
                    <button onClick={() => setCollapsed(!collapsed)}>
                        <FontAwesomeIcon icon={collapsed ? faChevronDown : faChevronUp} />
                    </button>
                )}
            </label>
            <ul>
                { (collapsed ? sortedSystems.slice(0, 3) : sortedSystems).map(({ system, details, familiarity }, i) => (
                    <li key={i} className={styles.system}>
                        <div className={styles.header}>
                            <label>{system}</label>
                            <div className={styles.stars}>
                                {[1,2,3,4,5].map(star => (
                                    <FontAwesomeIcon
                                        key={star}
                                        className={`${styles.star} ${familiarity >= star ? styles.familiar : undefined}`}
                                        icon={faStar} />
                                ))}
                            </div>
                            <span>({SystemFamiliarityList[familiarity - 1]})</span>
                        </div>

                        <Markdown text={details} />
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default PlaytestDetailsPage