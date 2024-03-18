import { NextSeo } from 'next-seo'
import styles from './[id].module.scss'
import { FC, useState } from 'react'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { Playtest } from '@/model/playtest';
import { Collections } from '@/server/mongodb';
import { ObjectId, WithId } from 'mongodb';
import { getAuth } from "@clerk/nextjs/server";
import { PublicUser, PublicUserSchema, SystemFamiliarityList, User } from '@/model/user';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faClose, faDownload, faFile, faShareFromSquare, faStar } from '@fortawesome/free-solid-svg-icons';
import { pojoMap } from '@/model/utils';
import { tagClassName } from '@/components/playtest/searchParams';
import Markdown from '@/components/utils/markdown';
import PlaytestCard from '@/components/playtest/card';
import Checkbox from '@/components/utils/checkbox';
import { trpcClient } from '@/server/utils';
import { useDialog } from '@/components/utils/dialog';
import { useRouter } from 'next/navigation';
import { ContractPDF, generateContract } from '@/components/playtest/edit/contract';


type PageProps = ServerSideProps & { 
    playtest: Playtest,
    author: PublicUser,
    applicants: PublicUser[],
}

export const getServerSideProps: ServerSidePropsGetter<PageProps> = async (ctx) => {
    const playtestId = ctx.params?.id as string
    if (!playtestId) throw new Error('Internal Server Error')

    // Get Playtest
    const playtests = await Collections.playtests()
    const playtestDoc = await playtests.findOne({ _id: new ObjectId(playtestId) })
    if (!playtestDoc) throw new Error('404 - Playtest not found')
    const playtest: Playtest = { ...playtestDoc, _id: playtestDoc._id.toString() }

    // Hide secret fields from the user if they aren't allowed to see them
    const userId = getAuth(ctx.req).userId;
    const canSee = !!userId && (
        (playtest.userId === userId) || (playtest.applications[userId] !== undefined)
    )
    if (!canSee) {
        playtest.privateDescription = ""
        playtest.feedbackURL = ""
        playtest.applications = {}
    }

    // Get Author & applicants
    const users = await Collections.users()
    const userProjection = pojoMap(PublicUserSchema.shape, () => 1 as const)
    const [authorDoc, applicants] = await Promise.all([
        users.findOne({ userId: playtest.userId }, { projection: userProjection }),
        !Object.keys(playtest.applications).length ? (
            new Promise(resolve => resolve([])) satisfies Promise<PublicUser[]>
        ) : (
            users.find({ userId: { $in: Object.keys(playtest.applications)}}, { projection: userProjection})
                .map(({ _id, ...user }) => user)
                .toArray() satisfies Promise<PublicUser[]>
        ),
    ])
    if (!authorDoc) throw new Error('404 - Author not found')
    const { _id, ...author } = authorDoc


    return {
        props: {
            ...(await serverPropsGetter(ctx)).props,
            playtest,
            author,
            applicants,
        }
    }
};


const PlaytestDetailsPage: FC<PageProps> = ({ userCtx, playtest, author, applicants }) => {
    const croppedName = playtest.name.length > 20 ? (playtest.name.substring(0, 20) + "...") : playtest.name
    
    const isCreator = (userCtx?.userId === playtest.userId)
    const isApplicant = !!userCtx?.userId && (playtest.applications[userCtx?.userId] !== undefined)
    const isAccepted = userCtx?.userId && playtest.applications[userCtx?.userId]
    
    const [agreed, setAgreed] = useState(isApplicant)
    const applyMutation = trpcClient.playtests.apply.useMutation()
    const acceptMutation = trpcClient.playtests.accept.useMutation()
    const closeMutation = trpcClient.playtests.close.useMutation()
    const { setDialog } = useDialog()
    const router = useRouter()

    // Sort systems known by the applicants, so that the ones useful for the playtest appear first.
    const systemsList = playtest.tags.filter(t => t.startsWith('Game: ')).map(t => t.substring('Game: '.length))
    type System = User['playerProfile']['systems'][number]
    function sortSystems(system1: System, system2: System) {
        const system1IsUseful = systemsList.includes(system1.system)
        const system2IsUseful = systemsList.includes(system2.system)

        if (system1IsUseful && system2IsUseful) return 0

        if (system1IsUseful) return 1
        if (system2IsUseful) return -1

        return 0
    }

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

                { !isCreator && (
                    <section className={styles.applicationForm}>
                        <h3>Send Application</h3>

                        <p>If You send an application, the publisher will be shown your public player profile.</p>

                        <Checkbox 
                            className={styles.agreeBtn}
                            disabled={isApplicant || playtest.closedManually || playtest.applicationDeadline < Date.now()}
                            value={agreed} 
                            onToggle={() => setAgreed(!agreed)}>
                                I agree to the terms above
                        </Checkbox>

                        <button 
                            disabled={isApplicant || !agreed || applyMutation.isLoading || playtest.closedManually || playtest.applicationDeadline < Date.now()} 
                            onClick={() => setDialog(
                                "Are you sure you wish to apply to this playtest? This cannot be undone.", 
                                async result => {
                                    if (!result) return;
                                    await applyMutation.mutateAsync(playtest._id)
                                    router.refresh() // TODO: replace this with playtestQuery.revalidate
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
                            { applicants.map(applicant => (
                                <li key={applicant.userId} className={styles.application}>
                                    <label className={styles.userName}>{applicant.userName}</label>
                                    
                                    { !!applicant.userBio.length && (
                                        <section>
                                            Bio:
                                            <Markdown text={applicant.userBio} />
                                        </section>
                                    )}

                                    { applicant.playerProfile.systems.length && (
                                        <section className={styles.systems}>
                                            <label>Systems known:</label>
                                            <ul>
                                                { applicant.playerProfile.systems.sort(sortSystems).map(({ system, details, familiarity }, i) => (
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
                                    )}

                                    { isCreator && (
                                        <section className={styles.actions}>
                                            { playtest.applications[applicant.userId] ? <>
                                                <h3>You have accepted this application</h3>
                                                <button onClick={() => setDialog(<div style={{ width: '600px' }}>
                                                    <ContractPDF
                                                        playtest={playtest}
                                                        user={userCtx.user}
                                                        text={generateContract(playtest, userCtx.user, applicant)}/>
                                                </div>, () => {})}>
                                                    Download Agreement
                                                    <FontAwesomeIcon icon={faFile} />
                                                </button>
                                            </> : (
                                                <button onClick={() => setDialog(<div className={styles.acceptDialog}>
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
                                                    router.refresh() // TODO: replace this with playtestQuery.revalidate
                                                })}>
                                                    Accept
                                                </button>
                                            )}
                                        </section>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className={styles.actions}>
                        <button 
                            disabled={playtest.closedManually || Date.now() > playtest.applicationDeadline}
                            onClick={() => setDialog("Are you sure? This cannot be undone.", async confirm => {
                                if (!confirm) return;
                                await closeMutation.mutateAsync(playtest._id)
                                router.refresh() // TODO: replace this with playtestQuery.revalidate
                            })}>
                                { (playtest.closedManually || Date.now() > playtest.applicationDeadline)
                                    ? "Applications Closed"
                                    : "Close Applications"
                                }
                                <FontAwesomeIcon icon={faClose} />
                        </button>
                    </div>
                </section>
            </div>
        </Page>
    )
}

export default PlaytestDetailsPage