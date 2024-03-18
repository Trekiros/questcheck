import { getPermissions } from "@/server/routers/users";
import { ServerSideProps } from "./page";
import { MutableUser, MutableUserSchema, newUser } from "@/model/user";
import { keys } from "@/model/utils";
import type { GetServerSideProps as ServerSidePropsGetter } from 'next'
import { getAuth, buildClerkProps } from "@clerk/nextjs/server";

// Server side
async function getUserCtx(userId: string|null): Promise<ServerSideProps['userCtx']> {
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

    return { user: result, permissions, userId }
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