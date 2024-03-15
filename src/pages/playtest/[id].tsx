import { NextSeo } from 'next-seo'
import styles from './[id].module.scss'
import { FC } from 'react'
import Page, { ServerSideProps } from '@/components/utils/page'
import { serverPropsGetter } from '@/components/utils/pageProps';
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { Playtest } from '@/model/playtest';
import { Collections } from '@/server/mongodb';
import { ObjectId, WithId } from 'mongodb';
import { getAuth } from "@clerk/nextjs/server";
import { PublicUser, PublicUserSchema } from '@/model/user';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import { pojoMap } from '@/model/utils';
import { tagClassName } from '@/components/playtest/searchParams';
import Markdown from '@/components/utils/markdown';
import PlaytestCard from '@/components/playtest/card';


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
        (playtest.userId === userId) || playtest.applications[userId]
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

    return (
        <Page userCtx={userCtx}>
            <NextSeo title={croppedName} />

            <div className={styles.playtestDetails}>
                <PlaytestCard playtest={playtest} author={author} />


            </div>
        </Page>
    )
}

export default PlaytestDetailsPage