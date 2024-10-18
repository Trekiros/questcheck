import { Collections } from '../mongodb';
import { protectedProcedure, router } from '../trpc';
import { WithId } from 'mongodb';
import { sendBatchNotifications } from './notifications';
import { Playtest } from '@/model/playtest';
import { arrMap } from '@/model/utils';

// Run the cron task, but only if it's been at least 3 hours since the last job
// The job is configured to be ran every day, but it's started from a public, un-authenticated API endpoint
let lastCronTimestamp = 0
export async function doCron() {
    const lastCronCol = await Collections.lastCron()

    if (lastCronTimestamp === 0) {
        const lastCron = await lastCronCol.findOne({ })
        if (lastCron) lastCronTimestamp = lastCron.timestamp
    }
    
    const now = Date.now()
    if (lastCronTimestamp + 23 * 60 * 60 * 1000 > now) throw new Error('Cron error: too soon!');

    await forceCron()
}

export async function forceCron() {
    lastCronTimestamp = Date.now()
    const lastCronCol = await Collections.lastCron()
    const oldCron = await lastCronCol.findOneAndReplace({}, { timestamp: lastCronTimestamp }, { returnDocument: 'before', upsert: true })
    console.log('Running Cron Job')

    const playtestCol = await Collections.playtests()
    const userCol = await Collections.users()
    const playtests = await playtestCol.find<WithId<Playtest>>({ 
        ...(oldCron ? (
            { createdTimestamp: { $gt: oldCron.timestamp } }
        ) : (  
            {}
        )),
    }).toArray()
    
    console.log('Cron job: - ', playtests.length, ' new playtests since the last cron')
    if (playtests.length === 0) return;

    const users = await userCol.find({
        userId: { $in: playtests.map(playtest => playtest.userId)}
    }).toArray()
    
    const usersById = arrMap(users, user => user.userId)

    const playtestsWithAuthors = playtests.map(playtest => ({ ...playtest, author: usersById[playtest.userId]}))

    await sendBatchNotifications(playtestsWithAuthors)
    console.log('Cron job finished')
}

// Expose a second API endpoint for the admin to manually force the cron job to run
export const CronRouter = router({
    force: protectedProcedure
        .mutation(async ({ ctx: { auth: { userId } } }) => {
            if (userId !== process.env.ADMIN_USERID) throw new Error('Unauthorized')

            await forceCron()
        }),
})
