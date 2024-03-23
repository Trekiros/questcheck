import { Playtest } from "@/model/playtest";
import { Collections } from "../mongodb";
import { Filter } from "mongodb";
import { NotificationFrequency, NotificationSetting } from "@/model/notifications";
import { discordSend } from "../discord";
import { User } from "@/model/user";

export async function sendBatchNotifications(playtests: (Playtest & { author: User })[]) {
    type NotifMap = {
        notification: NotificationSetting,
        matchingPlaytests: (Playtest & { author: User })[],
    }

    // Go through all users who have notifications enabled, but in small batches to ensure the server doesn't exceed capacity
    async function batchUsers(callback: (notifications: NotifMap[]) => Promise<void>) {
        const userCol = await Collections.users()
    
        const userFilter: Filter<User> = { 
            "playerProfile.notifications.frequency": 'Once every 4 hours' satisfies NotificationFrequency
        }
    
        const BATCH_SIZE = 100
        const usersCount = await userCol.countDocuments(userFilter)
        for (let i = 0 ; i < usersCount / BATCH_SIZE ; i++) {
            const notifications = (await userCol.find(userFilter)
                .limit(BATCH_SIZE)
                .skip(i * BATCH_SIZE)
                .toArray())
                .flatMap(user => user.playerProfile.notifications)
                .filter(notif => notif.frequency === 'Once every 4 hours')
                .map(mapPlaytests)
    
            await callback(notifications)
        }
    }

    // For each notification setting, find the list of playtests that match the notification's filters, and send the corresponding Discord message.
    function mapPlaytests(notification: NotificationSetting) {
        const matchingPlaytests = playtests.filter(playtest => {
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
        })

        return { notification, matchingPlaytests }
    }

    async function batchDiscordSend(notifications: NotifMap[]) {
        for (const { notification, matchingPlaytests } of notifications) {
            await discordSend(
`# ${notification.name}
${ 
    matchingPlaytests.map(playtest => `* "${
        playtest.name
    }" by ${
        playtest.author.userName
    }: ${
        process.env.NODE_ENV === "development" ? 'http://localhost:3000' : 'https://www.questcheck.org'
    }/playtest/${playtest._id}`)
    .join('\n')
}
${
    ((notification.target.type === 'channel') && (!!notification.target.role)) ? 
        `<@&${notification.target.role}>` : ''
}`, notification.target)
        }
    }

    
    await batchUsers(batchDiscordSend)
}

export async function playtestCreatedNotification(playtest: Playtest, author: User) {
    const userCol = await Collections.users()

    const $and: Filter<NotificationSetting>["$and"] = []
    
    // Tags
    $and.push({ $or: [
        { 'filter.includeTags': { $exists: false } },
        playtest.tags.map(tag => ({ 'filter.includeTags': tag }))
    ]})
    $and.push({ $or: [
        { 'filter.excludeTags': { $exists: false } },
        playtest.tags.map(tag => ({ 'filter.excludeTags': { $ne: tag } }))
    ]})
    
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
        { "playerProfile.notifications": { $elemMatch: { 
            frequency: 'Whenever a playtest is created' satisfies NotificationFrequency,
            $and,
        } } },
        { projection: { "playerProfile.notifications": 1 } },
    )
        .map(user => user.playerProfile.notifications)
        .toArray())
        .flatMap(list => list)

    console.log(`Found ${notifications.length} notifications`)

    await Promise.all(
        notifications.map(notification => discordSend(
`# ${notification.name}
${playtest.name}
By ${author.userName}

Tags: ${playtest.tags.join(', ')}
Type: ${playtest.task}
Bounty: ${playtest.bounty}

More details: ${process.env.NODE_ENV === "development" ? 'http://localhost:3000' : 'https://www.questcheck.org'}/playtest/${playtest._id}
${
    ((notification.target.type === 'channel') && (!!notification.target.role)) ? 
        `<@&${notification.target.role}>` : ''
}`,
            notification.target
        ))
    )
}