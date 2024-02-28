import { Collections } from "../mongodb";
import { User } from "@/model/user";
import { auth } from "@clerk/nextjs";
import { revalidateTag, unstable_cache } from "next/cache";

const tag = (userId: string) => `user:${userId}`

export const getUser = async () => {
	const { userId } = auth()
    if (!userId) return null;

    const callback = async () => {
        const users = await Collections.users()
        const user: User = await users.findOne({ userId }, { projection: { _id: 0 }}) as User

        console.log("Fetch is performed")
        return user
    }

    return await (unstable_cache(callback, ["user"], { revalidate: 3600, tags: [tag(userId)]}))()
}

export const updateUser = async (user: User) => {
    const { userId, ...$set } = user
    const users = await Collections.users()
    const result = await users.findOneAndUpdate({ userId }, { $set }, { upsert: true })
    revalidateTag(tag(userId))
    return result
}
