import { PlaytestSearchParamSchema, Playtest, CreatablePlaytestSchema, PerPageSchema, Task, Bounty, PlaytestSummarySchema, PlaytestSummary } from "@/model/playtest";
import { Collections } from "../mongodb";
import { z } from "zod";
import { Filter, FindCursor, ObjectId } from "mongodb";
import {  protectedProcedure, router, publicProcedure } from "../trpc";
import { arrMap, pojoMap } from "@/model/utils";
import { PublicUser, PublicUserSchema } from "@/model/user";
import { getPermissions } from "./users";

// Returns the id of the new Playtest
const create =  protectedProcedure
    .input(CreatablePlaytestSchema)
    .mutation(async ({ input, ctx: { auth: { userId }} }) => {
        const { permissions } = await getPermissions(userId)
        if (!permissions.canCreate) throw new Error('Unauthorized')
        
        // Create playtest
        const playtests = await Collections.playtests()
        const newPlaytest: Omit<Playtest, '_id'> = {
            ...input,
            userId,
            createdTimestamp: Date.now(),
            closedManually: false,
            applications: {},
        }
        const result = await playtests.insertOne(newPlaytest)

        if (!result.acknowledged) throw new Error('Internal server error')

        return result.insertedId.toString()
    })


// Returns basic info about a playtest, just enough to print a summary on screen
const search = publicProcedure
    .input(z.object({
        search: PlaytestSearchParamSchema, 
        page: z.number(),
        perPage: PerPageSchema,
    }))
    .query(async ({input: { search, page, perPage }}) => {
        // Create filter
        type PlaytestFilter = Filter<Omit<Playtest, '_id'>>
        const $and: NonNullable<PlaytestFilter["$and"]> = []

        if (search.includeTags?.length) { $and.push({ tags: { $in: search.includeTags }}) }
        if (search.excludeTags?.length) { $and.push({ tags: { $nin: search.excludeTags }}) }
        if (search.includeAuthors) { $and.push({ userId: { $in: search.includeAuthors }}) }
        if (search.excludeAuthors) { $and.push({ userId: { $nin: search.excludeAuthors }})}
        
        if (search.acceptableTasks) {
            const acceptableTasks: Task[] = []
            for (const task in search.acceptableTasks) {
                if (search.acceptableTasks[task as Task]) acceptableTasks.push(task as Task)
            }

            if (acceptableTasks.length) $and.push({ task: { $in: acceptableTasks }})
        } 
        if (search.acceptableBounties) {
            const acceptableBounties: Bounty[] = []
            for (const bounty in search.acceptableBounties) {
                if (search.acceptableBounties[bounty as Bounty]) acceptableBounties.push(bounty as Bounty)
            }

            if (acceptableBounties.length) $and.push({ bounty: { $in: acceptableBounties }})
        }
        if (search.after) {
            $and.push({ $or: [
                { scheduleDate: { $exists: false }},
                { scheduleDate: { $gte: search.after }},
            ] })
        }
        
        const filter: PlaytestFilter = { }
        if ($and.length > 0) { filter.$and = $and }
        
        // Fetch playtests
        const playtestCol = await Collections.playtests()
        const playtestProjection = pojoMap(PlaytestSummarySchema.shape, () => 1 as const)
        let cursor: FindCursor<PlaytestSummary> = playtestCol.find(filter, { projection: playtestProjection })
            .sort({ createdTimestamp: -1 })
            .map(playtest => ({ ...playtest, _id: playtest._id.toString() }))

        if (page !== 0) { cursor = cursor.skip((page - 1) * perPage) }

        const playtests: PlaytestSummary[] = await cursor.toArray()

        // Fetch users who created the playtests
        const userIds = playtests.map(playtest => playtest.userId)
        const userCol = await Collections.users()
        const userProjection = pojoMap(PublicUserSchema.shape, () => 1 as const)
        const users: PublicUser[] = !userIds.length ? []
            : await userCol.find({ userId: { $in: userIds } }, { projection: userProjection })
                .map(user => ({ ...user, _id: user._id.toString() }))    
                .toArray()
        const usersById = arrMap(users, user => user.userId)


        // Map playtests to their authors
        const result: (PlaytestSummary & { author?: PublicUser })[] = playtests.map(playtest => ({ 
            ...playtest,
            author: usersById[playtest.userId]!,
        }))

        return result
    })


const apply = protectedProcedure
    .input(z.string().length(12))
    .mutation(async ({ input, ctx: { auth: { userId } } }) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(input), 
                closedManually: false, 
                applicationDeadline: { $gte: Date.now() } 
            },
            { $set: { 
                ["applications." + userId]: false 
            } },
        )

        return !!result.modifiedCount
    })

const accept = protectedProcedure
    .input(z.object({ playtestId: z.string(), applicantId: z.string() }))
    .mutation(async ({ input: { playtestId, applicantId }, ctx: { auth: { userId }}}) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(playtestId),
                userId,
                ["applications." + applicantId]: false,
            },
            { $set: { 
                ["applications." + applicantId]: true,
            } },
        )

        return !!result.modifiedCount
    })

export const PlaytestRouter = router({
    create,
    search,
    apply,
    accept,
})