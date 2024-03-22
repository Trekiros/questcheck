import { Playtest } from "@/model/playtest";
import { Collections } from "../mongodb";
import { Filter } from "mongodb";
import { NotificationSetting } from "@/model/notifications";
import { discordSend } from "../discord";
import { User } from "@/model/user";

export async function findTargets(playtest: Playtest, author: User) {
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
        { "playerProfile.notifications": { $elemMatch: { $and } } },
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
            [notification.target]
        ))
    )
}