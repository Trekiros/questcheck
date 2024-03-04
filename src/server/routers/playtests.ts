import { PlaytestSearchParamSchema, Playtest, PlaytestSearchParams, MutablePlaytestSchema } from "@/model/playtest";
import { Collections } from "../mongodb";
import { z } from "zod";
import { Filter, FindCursor } from "mongodb";
import { protectedProcedure, publicProcedure, router } from "../trpc";

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

    create: protectedProcedure
        .input(MutablePlaytestSchema)
        .mutation(async ({ input, ctx: { auth: { userId }} }) => {
            const users = await Collections.users()
            const playtests = await Collections.playtests()

            // Check authorizations
            const userInfo = await users.findOne({ userId })
            if (!userInfo) throw new Error('You must fill in your profile information before you can create playtests.')
            if (!userInfo.isPublisher) throw new Error('You must be a publisher to create playtests.')
            if (
                !userInfo.publisherProfile.facebookProof
             && !userInfo.publisherProfile.twitterProof
             && !userInfo.publisherProfile.manualProof
            ) throw new Error('You must verify your identity as a publisher to create playtests.')

            // Create playtest
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