import { PlaytestSearchParamSchema, Playtest, CreatablePlaytestSchema, PerPageSchema, Task, Bounty, PlaytestSummarySchema, PlaytestSummary } from "@/model/playtest";
import { Collections } from "../mongodb";
import { z } from "zod";
import { Filter, FindCursor, ObjectId } from "mongodb";
import {  protectedProcedure, router, publicProcedure } from "../trpc";
import { arrMap, pojoMap } from "@/model/utils";
import { PublicUser, PublicUserSchema } from "@/model/user";
import { UserReviewSchema } from "@/model/reviews";
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
    .query(async ({ input: { search, page, perPage }, ctx }) => {
        // Create filter
        type PlaytestFilter = Filter<Omit<Playtest, '_id'>>
        const $and: NonNullable<PlaytestFilter["$and"]> = []

        if (search.includesMe) {
            if (!ctx.auth.userId) throw new Error('Unauthorized')

            $and.push({ [`applications.${ctx.auth.userId}`]: { $exists: true } })
        }

        if (!search.includeClosed) { 
            $and.push( { closedManually: { $ne: true } })
            $and.push({ applicationDeadline: { $gt: Date.now() } })
        }
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
        const count = await playtestCol.countDocuments(filter)

        // Fetch users who created the playtests
        const userIds = new Set(playtests.map(playtest => playtest.userId))
        const userCol = await Collections.users()
        const userProjection = pojoMap(PublicUserSchema.shape, () => 1 as const)
        const users: PublicUser[] = !userIds.size ? []
            : await userCol.find({ userId: { $in: Array.from(userIds) } }, { projection: userProjection })
                .map(user => ({ ...user, _id: user._id.toString() }))    
                .toArray()
        const usersById = arrMap(users, user => user.userId)


        // Map playtests to their authors
        const result: (PlaytestSummary & { author?: PublicUser })[] = playtests.map(playtest => ({ 
            ...playtest,
            author: usersById[playtest.userId]!,
        }))

        return { count, playtests: result }
    })


const apply = protectedProcedure
    .input(z.string().max(30))
    .mutation(async ({ input, ctx: { auth: { userId } } }) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(input), 
                closedManually: false, 
                applicationDeadline: { $gte: Date.now() } 
            },
            { $set: { 
                ["applications." + userId]: null 
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
                ["applications." + applicantId]: { $eq: null },
            },
            { $set: { 
                ["applications." + applicantId]: true,
            } },
        )

        return !!result.modifiedCount
    })
    

const reject = protectedProcedure
    .input(z.object({ playtestId: z.string(), applicantId: z.string() }))
    .mutation(async ({ input: { playtestId, applicantId }, ctx: { auth: { userId }}}) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(playtestId),
                userId,
                ["applications." + applicantId]: { $eq: null },
            },
            { $set: { 
                ["applications." + applicantId]: false,
            } },
        )

        return !!result.modifiedCount
    })

const close = protectedProcedure
    .input(z.string().max(30))
    .mutation(async ({ input, ctx: { auth: { userId } } }) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(input),
                userId,
                closedManually: false,
            },
            { $set: {
                closedManually: true,
            } },
        )

        return !!result.modifiedCount
    })

export const review = protectedProcedure
    .input(UserReviewSchema.omit({}))
    .mutation(async ({ input, ctx }) => {
        const reviewsCol = await Collections.userReviews()
        await reviewsCol.updateOne({
            byUserId: input.byUserId,
            ofUserId: input.ofUserId,
            duringPlaytestId: input.duringPlaytestId,
        }, { $set: {
            rating: input.rating,
            comment: input.comment,
            createdTimestamp: Date.now(),
        }}, {
            upsert: true,
        })
    })

export const PlaytestRouter = router({
    create,
    search,
    apply,
    accept,
    reject,
    close,
    review,
})