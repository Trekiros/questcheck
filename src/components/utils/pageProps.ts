import { getPermissions } from "@/server/routers/users";
import { ServerSideProps } from "./page";
import { MutableUser, MutableUserSchema, User, newUser } from "@/model/user";
import { arrMap, keys } from "@/model/utils";
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { getAuth, buildClerkProps } from "@clerk/nextjs/server";
import { Collections } from "@/server/mongodb";
import { UserReview } from "@/model/reviews";

// Server side
export async function getUserCtx(userId: string|null, opts?: {
    withReviews?: boolean,
    userCallback?: (user: User) => (void | Promise<void>),
}): Promise<ServerSideProps['userCtx']> {
    if (!userId) return null;

    const { user, permissions } = await getPermissions(userId)

    if (!user) return null;

    // Only return fields if they're public/mutable.
    const result: MutableUser = structuredClone(newUser)
    for (let key of keys(MutableUserSchema.shape)) {
        (result as any)[key] = user[key]
    }

    // Just in case these fields weren't deleted properly.
    if (user) {
        if (!user.isPlayer) user.playerProfile = newUser.playerProfile
        if (!user.isPublisher) user.publisherProfile = newUser.publisherProfile
    }

    // If the user has reviews, fetch them & their author's names
    let reviews: (UserReview & { author: string })[] = []
    if (opts?.withReviews && user.playerReviews.length) {
        const reviewerIds = Array.from(new Set(user.playerReviews.map(review => review.byUserId)))
        const userCol = await Collections.users()
        const reviewerProjection: {[key in keyof User]?: 1} = { userName: 1, userId: 1 }
        const reviewers = await userCol.find<Pick<User, 'userId'|'userName'>>({ userId: { $in: reviewerIds } }, { projection: reviewerProjection })
            .toArray()

        const reviewerNamesById = arrMap(reviewers, (reviewer) => reviewer.userId)

        reviews = user.playerReviews.map(review => ({ ...review, author: reviewerNamesById[review.byUserId].userName }))
    }

    // If the user has a callback, call it.
    if (opts?.userCallback) {
        await opts.userCallback(user)
    }

    return { user: result, permissions, userId, reviews }
}

// Server side (every single page should re-export this function)
export const serverPropsGetter = (async (ctx) => {
    const { userId } = getAuth(ctx.req);

    return {
        props: {
            ...buildClerkProps(ctx.req),
            userCtx: await getUserCtx(userId),
        }
    }
}) satisfies ServerSidePropsGetter<ServerSideProps>
