import { PlaytestSearchParamSchema, Playtest, CreatablePlaytestSchema, PerPageSchema, Task, Bounty, PlaytestSummarySchema, PlaytestSummary, ApplicationStatusMap } from "@/model/playtest";
import { Collections } from "../mongodb";
import { z } from "zod";
import { AggregationCursor, Filter, FindCursor, ObjectId, WithId } from "mongodb";
import {  protectedProcedure, router, publicProcedure } from "../trpc";
import { arrMap, pojoMap } from "@/model/utils";
import { PublicUser, PublicUserSchema, User } from "@/model/user";
import { getPermissions } from "./users";
import { playtestCreatedNotification } from "./notifications";

// Returns the id of the new Playtest
const create =  protectedProcedure
    .input(CreatablePlaytestSchema)
    .mutation(async ({ input, ctx: { auth: { userId }} }) => {
        const { permissions, user } = await getPermissions(userId)
        if (!user || !permissions.canCreate) throw new Error('Unauthorized')
        
        // Create playtest
        const playtests = await Collections.playtests()
        const newPlaytest: Omit<Playtest, '_id'> = {
            ...input,
            userId,
            createdTimestamp: Date.now(),
            closedManually: false,
            applications: [],
        }
        const result = await playtests.insertOne(newPlaytest)
        if (!result.acknowledged) throw new Error('Internal server error')

        // Not awaited - this shouldn't block the publisher's UI.
        setTimeout(async () => {
            await playtestCreatedNotification({...newPlaytest, _id: result.insertedId.toString() }, user)
        })

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

            $and.push({ [`applications`]: { $elemMatch: {
                applicantId: ctx.auth.userId,
                status: { $ne: 'rejected' }
            } satisfies Filter<Playtest['applications'][number]> }})
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

// Retrieves a single Playtest, and performs a bunch of joins to ensure all of the data is available
export const playtestById = async (playtestId: string, userId: string|null) => {
    // Get Playtest
    const playtestCol = await Collections.playtests()
    const usersCol = await Collections.users()

    type ResultType = WithId<Playtest> & {
        author: PublicUser[], 
        applicants: (PublicUser & Pick<User, "playerReviews">)[] | null,
        reviewers: Pick<User, "userId"|"userName">[] | null
    }
    const publicUserProjection = { ...pojoMap(PublicUserSchema.shape, () => 1 as const), _id: 0 }
    const cursor = (((playtestCol.aggregate<WithId<Playtest>>()
        .match({ _id: new ObjectId(playtestId) })
        .lookup({
            from: usersCol.collectionName,
            localField: "userId",
            foreignField: "userId",
            pipeline: [
                { $project: publicUserProjection },
            ],
            as: "author",
        }) as AggregationCursor<Omit<ResultType, "applicants"|"reviewers">>) // This should say "satisfies" instead of "as", but mongo's library gave up typing lookups
        .lookup({
            from: usersCol.collectionName,
            localField: "applications.applicantId",
            foreignField: "userId",
            pipeline: [
                { $project: { ...publicUserProjection, playerReviews: 1 } },
            ],
            as: "applicants",
        }) as AggregationCursor<Omit<ResultType, "reviewers">>) // Same as above
        .lookup({
            from: usersCol.collectionName,
            localField: "applicants.playerReviews.byUserId",
            foreignField: "userId",
            pipeline: [
                { $project: { userId: 1, userName: 1 } },
            ],
            as: "reviewers",
        }) as AggregationCursor<ResultType>) // Same as above

    const result = await cursor.next()
    await cursor.close()

    if (!result) throw new Error("404 - Playtest not found")
    const { applicants, reviewers, author, _id, ...playtestData } = result
    const playtest: Playtest = { _id: _id.toString(), ...playtestData }

    // Hide secret fields from the user if they aren't allowed to see them
    const isCreator = !!userId && (playtest.userId === userId)
    const isParticipant = !!playtest.applications.find(app => app.applicantId === userId)
    if (!isCreator && !isParticipant) {
        playtest.privateDescription = ""
        playtest.feedbackURL = ""
    }
    if (!isCreator) {
        if (applicants) {
            for (const applicant of applicants) {
                applicant.playerReviews = []
            }
        }
    }

    // Map reviewers
    const reviewerNameById: {[key: string]: string} = {}
    if (isCreator && !!reviewers) {
        for (const reviewer of reviewers) {
            reviewerNameById[reviewer.userId] = reviewer.userName
        }
    }

    return { 
        playtest, 
        author: author[0], 
        applicants: applicants || [], 
        reviewerNameById,
    }
}

const find = publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
        if (!ObjectId.isValid(input)) throw new Error('Invalid Input!')

        return await playtestById(input, ctx.auth.userId)
    })

const apply = protectedProcedure
    .input(z.string().max(30))
    .mutation(async ({ input, ctx: { auth: { userId } } }) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(input), 

                // Can't apply if applications are closed
                closedManually: false, 
                applicationDeadline: { $gte: Date.now() },

                // Can't apply if already an applicant
                "applications.applicantId": { $ne: userId },
            },
            { $push: {
                applications: {
                    applicantId: userId,
                    createdTimestamp: Date.now(),
                    status: ApplicationStatusMap.pending,
                }
            } },
        )

        return !!result.modifiedCount
    })

const accept = protectedProcedure
    .input(z.object({ playtestId: z.string(), applicantId: z.string() }))
    .mutation(async ({ input: { playtestId, applicantId }, ctx: { auth: { userId }}}) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.findOneAndUpdate(
            { 
                _id: new ObjectId(playtestId),
                userId,
                "applications.applicantId": applicantId,
            },
            { $set: { 
                "applications.$.status": ApplicationStatusMap.accepted,
            } },
        )

        return !!result
    })
    

const reject = protectedProcedure
    .input(z.object({ playtestId: z.string(), applicantId: z.string() }))
    .mutation(async ({ input: { playtestId, applicantId }, ctx: { auth: { userId }}}) => {
        const playtestCol = await Collections.playtests()
        const result = await playtestCol.updateOne(
            { 
                _id: new ObjectId(playtestId),
                userId,
                "applications.applicantId": applicantId,
            },
            { $set: { 
                "applications.$.status": ApplicationStatusMap.rejected,
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

export const PlaytestRouter = router({
    create,
    search,
    find,
    apply,
    accept,
    reject,
    close,
})