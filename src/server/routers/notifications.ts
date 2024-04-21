import { Playtest } from "@/model/playtest";
import { Collections } from "../mongodb";
import { Filter } from "mongodb";
import { NotificationFrequency, NotificationSetting } from "@/model/notifications";
import { discordSend } from "../discord";
import { User } from "@/model/user";

// Checks that a playtest matches the filters of a notification setting in memory.
function memMatch(playtest: Playtest, notification: NotificationSetting) {
    // Playtest is closed
    if (playtest.closedManually || playtest.applicationDeadline < Date.now()) return false

    // Tags
    if (
        (notification.filter.includeTags !== undefined)
        && (!notification.filter.includeTags.find(tag => playtest.tags.includes(tag)))
    ) return false;
    if (
        (notification.filter.excludeTags!== undefined)
        && (notification.filter.excludeTags.find(tag => playtest.tags.includes(tag)))
    ) return false;

    // Task
    if (
        (notification.filter.acceptableTasks !== undefined)
        && (!notification.filter.acceptableTasks[playtest.task])
    ) return false;

    // Bounty
    if (
        (notification.filter.acceptableBounties !== undefined)
        && (!notification.filter.acceptableBounties[playtest.bounty])
    ) return false;

    // Author
    if (
        (notification.filter.includeAuthors !== undefined)
        && (!notification.filter.includeAuthors.includes(playtest.userId))
    ) return false;
    if (
        (notification.filter.excludeAuthors !== undefined)
        && (notification.filter.excludeAuthors.includes(playtest.userId))
    ) return false;

    return true;
}

export async function sendBatchNotifications(playtests: (Playtest & { author: User })[]) {
    if (!playtests.length) {
        console.log('Cron job - no notifications to send, skipping.')
        return;
    }

    type NotifMap = {
        notification: NotificationSetting,
        matchingPlaytests: (Playtest & { author: User })[],
    }

    // Go through all users who have notifications enabled, but in small batches to ensure the server doesn't exceed capacity
    async function batchUsers(callback: (notifications: NotifMap[]) => Promise<void>) {
        const userCol = await Collections.users()
    
        const userFilter: Filter<User> = {
            "playerProfile.notifications.frequency": 'Once per day' satisfies NotificationFrequency
        }
    
        const BATCH_SIZE = 100
        const usersCount = await userCol.countDocuments(userFilter)
        for (let i = 0 ; i < usersCount / BATCH_SIZE ; i++) {
            const notifications = (await userCol.find(userFilter)
                .limit(BATCH_SIZE)
                .skip(i * BATCH_SIZE)
                .toArray())
                .flatMap(user => user.playerProfile.notifications)
                .filter(notif => notif.frequency === 'Once per day')
                .map(notification => {
                    const matchingPlaytests = playtests.filter(playtest => memMatch(playtest, notification))

                    return { notification, matchingPlaytests }
                })
            
            console.log('Sending ', notifications.length, ' notifications')
            if (!notifications.length) return;
    
            await callback(notifications)
        }
    }

    async function batchDiscordSend(notifications: NotifMap[]) {
        for (const { notification, matchingPlaytests } of notifications) {
            if (matchingPlaytests.length) {
                await discordSend(
                    `# ${notification.name}\n`
                  + matchingPlaytests.map(playtest => `* "${
                        playtest.name
                    }" by ${
                        playtest.author.userName
                    } (${
                        playtest.task
                    }, ${
                        playtest.bounty
                    }): ${
                        process.env.NODE_ENV === "development" ? 'http://localhost:3000' : 'https://www.questcheck.org'
                    }/playtest/${playtest._id}`)
                    .join('\n')
                  + (
                        ((notification.target.type === 'channel') && (!!notification.target.role))
                            ? `\n\n<${notification.target.role === "@everyone" ? "@everyone" : `@&${notification.target.role}`}>` 
                            : ''
                    ),
                    notification.target
                )
            }
        }
    }
    
    await batchUsers(batchDiscordSend)
}

export async function playtestCreatedNotification(playtest: Playtest, author: User) {
    const userCol = await Collections.users()

    const $and: Filter<NotificationSetting>["$and"] = []
    
    // Tags
    if (playtest.tags.length) {
        $and.push({ $or: [
            { 'filter.includeTags': { $exists: false } },
            { 'filter.includeTags': { $in: playtest.tags } },
        ]})
        $and.push({ $or: [
            { 'filter.excludeTags': { $exists: false } },
            { 'filter.includeTags': { $nin: playtest.tags } },
        ]})
    }
    
    // Task
    $and.push({ $or: [
        { 'filter.acceptableTasks': { $exists: false } },
        { 'filter.acceptableTasks': playtest.task },
    ]})

    // Bounty
    $and.push({ $or: [
        { 'filter.acceptableBounties': { $exists: false } },
        { 'filter.acceptableBounties': playtest.bounty },
    ]})

    const notifications = (await userCol.find(
        { 
            "isPlayer": true,
            "playerProfile.notifications": {
                $elemMatch: {
                    frequency: 'Whenever a playtest is created' satisfies NotificationFrequency,
                    $and,
                }
            }, 
        },
        { projection: { "playerProfile.notifications": 1 } },
    )
        .map(user => user.playerProfile.notifications)
        .toArray())
        .flatMap(list => list)
        .filter(notif => (notif.frequency === 'Whenever a playtest is created'))
        .filter(notif => memMatch(playtest, notif))

    // Note: a second, in-memory filter is needed, because the only projections we can use are either:
    // 1) "playerProfile.notifications" => returns all of the user's notifs, including non-matching ones
    // 2) "playerProfile.notifications.$" => returns the first matching notif only, even though the playtest might match more than one

    console.log('New playtest creates, id:', playtest._id, '\t\tSending notifications to ', notifications.length, ' targets')

    await Promise.all(
        notifications.map(notification => discordSend(
            `# ${notification.name}\n`
          + `${playtest.name}\n`
          + `By ${author.userName}\n\n`
          + `Tags: ${playtest.tags.join(', ')}\n`
          + `Type: ${playtest.task}\n`
          + `Bounty: ${playtest.bounty}\n\n`

          + `More details: ${
                process.env.NODE_ENV === "development" ? 'http://localhost:3000' : 'https://www.questcheck.org'
            }/playtest/${playtest._id}`
          + (
                ((notification.target.type === 'channel') && (!!notification.target.role)) ? 
                    `\n<${notification.target.role === "@everyone" ? "@everyone" : `@&${notification.target.role}`}>` : ''

            ),
            notification.target
        ))
    )
}

export async function applicationCreatedNotification(playtest: Playtest, applicantId: string) {
    const userCol = await Collections.users()

    const [author, applicant] = await Promise.all([
        userCol.findOne({ userId: playtest.userId }),
        userCol.findOne({ userId: applicantId }),
    ])

    if (!author) throw new Error('ApplicationCreatedNotification: playtest author not found')
    if (!applicant) throw new Error('ApplicationCreatedNotification: applicant not found')

    if (author.isPlayer && author.playerProfile.dmOnApply) {
        await discordSend(
            `## New Application for "${playtest.name}"\n`
          + `By ${applicant.userName}\n\n`
          + (process.env.NODE_ENV === "development" ? 'http://localhost:3000' : 'https://www.questcheck.org')
                + `/playtest/${playtest._id}`,
            {
                type: 'dm',
                userId: author.playerProfile.dmOnApply,
            }
        )
    }
}

export async function applicationAcceptedNotification(playtest: Playtest, applicantId: string) {
    const userCol = await Collections.users()

    const applicant = await userCol.findOne({ userId: applicantId })

    if (!applicant) throw new Error('ApplicationAcceptedNotification: applicant not found')

    if (applicant.isPlayer && applicant.playerProfile.dmOnAccept) {
        await discordSend(
            `## Application Accepted for "${playtest.name}"\n`
          + `You now have access to the playtest survey link and other instructions from the publisher.\n\n`
          + (process.env.NODE_ENV === "development" ? 'http://localhost:3000' : 'https://www.questcheck.org')
                + `/playtest/${playtest._id}`,
            {
                type: 'dm',
                userId: applicant.playerProfile.dmOnAccept,
            }
        )
    }
}