import { Collections } from '../mongodb';
import { protectedProcedure, router } from '../trpc';
import { AggregationCursor, Filter, ObjectId, WithId } from 'mongodb';
import { sendBatchNotifications } from './notifications';
import { User } from '@/model/user';
import { Playtest } from '@/model/playtest';
import { idToString, keys } from '@/model/utils';

// Run the cron task, but only if it's been at least 3 hours since the last job
// The job is configured to be ran every 4 hours, but it's started from a public, un-authenticated API endpoint
let lastCronTimestamp = 0
export async function doCron() {
    const lastCronCol = await Collections.lastCron()

    if (lastCronTimestamp === 0) {
        const lastCron = await lastCronCol.findOne({ })
        if (lastCron) lastCronTimestamp = lastCron.timestamp
    }
    
    const now = Date.now()
    if (lastCronTimestamp + 3 * 60 * 60 * 1000 > now) throw new Error('Cron error: too soon!');

    await forceCron()
}

export async function forceCron() {
    lastCronTimestamp = Date.now()
    const lastCronCol = await Collections.lastCron()
    const oldCron = await lastCronCol.findOneAndReplace({}, { timestamp: lastCronTimestamp }, { returnDocument: 'before' })
    console.log('Running Cron Job')

    const playtestCol = await Collections.playtests()
    const userCol = await Collections.users()
    const playtests = await (playtestCol.aggregate<WithId<Playtest>>()
        .match({ createdTimestamp: { $gt: oldCron?.timestamp || 0 } } satisfies Filter<WithId<Playtest>>)
        .lookup({
            from: userCol.collectionName,
            localField: "userId",
            foreignField: "userId",
            as: "author",
        }) as AggregationCursor<WithId<Playtest> & { author: WithId<User> }>)
        .map(({ author, ...playtest }) => {
            const cleanAuthor = idToString(author)
            const cleanPlaytest = idToString(playtest)
            
            return { ...cleanPlaytest, author: cleanAuthor}
        })
        .toArray()

    await sendBatchNotifications(playtests)
}

// Expose a second API endpoint for the admin to manually force the cron job to run
export const CronRouter = router({
    force: protectedProcedure
        .mutation(async ({ ctx: { auth: { userId } } }) => {
            if (userId !== process.env.ADMIN_USERID) throw new Error('Unauthorized')

            await forceCron()
        }),
})
