import { PlaytestSearchParamSchema, Playtest, MutablePlaytestSchema } from "@/model/playtest";
import { Collections } from "../mongodb";
import { z } from "zod";
import { Filter, FindCursor } from "mongodb";
import { protectedProcedure, publicProcedure, router } from "../trpc";

// Returns true if the user is allowed to create a new playtest
async function canCreate(userId: string|null) {
    if (!userId) return false;

    const playtests = await Collections.playtests()
    const users = await Collections.users()
    
    const [ userInfo, recentPlaytests ] = await Promise.all([
        users.findOne({ userId }),
        playtests.find({ createdTimestamp: { $lte: Date.now() - 3 * 24 * 60 * 60 * 1000 } }).count(),
    ])

    if (!userInfo) return false // User not exists
    if (!userInfo.isPublisher) return false // User isn't publisher
    if (
        !userInfo.publisherProfile.facebookProof
     && !userInfo.publisherProfile.twitterProof
     && !userInfo.publisherProfile.manualProof
    ) return false // User has not given proof of identity

    if (recentPlaytests >= 3) return false

    return true
}


export const PlaytestRouter = router({
    search: publicProcedure
        .input(z.object({
            search: PlaytestSearchParamSchema, 
            page: z.number(), 
            perPage: z.literal(10).or(z.literal(25)).or(z.literal(50))
        }))
        .query(async ({input: { search, page, perPage }}) => {
            // Create filter
            const $and: Filter<Playtest>["$and"] = []

            if (search.includeTags?.length) { $and.push({ tags: { $in: search.includeTags }}) }
            if (search.excludeTags?.length) { $and.push({ tags: { $ne: search.excludeTags }}) }
            if (search.acceptableTasks) {
                const acceptableTasks = Object.keys(search.acceptableTasks)
                $and.push({ task: { $in: acceptableTasks as any }})
            } 
            if (search.acceptableBounties) {
                const acceptableBounties = Object.keys(search.acceptableBounties)
                $and.push({ bounty: { $in: acceptableBounties as any }})
            }
            if (search.after) {
                $and.push({ $or: [
                    { scheduleDate: { $exists: false }},
                    { scheduleDate: { $gte: search.after }},
                ] })
            }
            if (search.before) {
                $and.push({ $or: [
                    { scheduleDate: { $exists: false }},
                    { scheduleDate: { $lte: search.before }},
                ]})
            }
            if (search.includeAuthors) {

            }

            const filter: Filter<Playtest> = {}
            if ($and.length > 0) { filter.$and = $and }
            
            // Fetch results
            const playtests = await Collections.playtests()
            let cursor: FindCursor<Playtest> = playtests.find(filter, { projection: { _id: 0 } })
                .sort({ createdTimestamp: -1 })

            if (page !== 0) {
                cursor = cursor.skip((page - 1) * perPage)
            }

            const result: Playtest[] = await cursor.toArray()
            return result
        }),

    canCreate: publicProcedure
        .query(async ({ ctx: { auth: { userId }}}) => {
            return await canCreate(userId)
        }),

    create: protectedProcedure
        .input(MutablePlaytestSchema)
        .mutation(async ({ input, ctx: { auth: { userId }} }) => {
            const isAllowed = await canCreate(userId)
            if (!isAllowed) throw new Error('Unauthorized')
            
            // Create playtest
            const playtests = await Collections.playtests()
            const newPlaytest: Playtest = {
                ...input,
                userId,
                createdTimestamp: Date.now(),
            }
            const result = await playtests.insertOne(newPlaytest)

            if (!result.acknowledged) throw new Error('Internal server error')

            return result.insertedId.toString()
        }),
})