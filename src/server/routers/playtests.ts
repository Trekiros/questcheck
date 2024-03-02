import { PlaytestSearchParamSchema, Playtest, PlaytestSearchParams } from "@/model/playtest";
import { Collections } from "../mongodb";
import { z } from "zod";
import { Filter, FindCursor } from "mongodb";
import { publicProcedure, router } from "../trpc";

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
})