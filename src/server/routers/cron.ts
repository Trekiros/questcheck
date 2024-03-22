import { ActionRowBuilder } from 'discord.js';
import { discordSend } from '../discord';
import { Collections } from '../mongodb';
import { protectedProcedure, router } from '../trpc';
import { ObjectId } from 'mongodb';
import { findTargets } from './notifications';
import { User } from '@/model/user';

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
    await lastCronCol.replaceOne({}, { timestamp: lastCronTimestamp })
    console.log('Running Cron Job')

    // TODO
    const playtests = await Collections.playtests()
    const users = await Collections.users()
    const playtest = (await playtests.find({ _id: new ObjectId("65eead623edb41cde9cb12e8")}).map(({ _id, ...playtest }) => ({ _id: _id.toString(), ...playtest })).toArray())[0]!
    const author = await users.findOne({ userId: "user_2dCd67k9pZb8x6lNNm5sgNhv7UG"}, { projection: { _id: 0 }})! as User

    await findTargets(playtest, author)
}

// Expose a second API endpoint for the admin to manually force the cron job to run
export const CronRouter = router({
    force: protectedProcedure
        .mutation(async ({ ctx: { auth: { userId } } }) => {
            if (userId !== process.env.ADMIN_USERID) throw new Error('Unauthorized')

            await forceCron()
        }),
})
