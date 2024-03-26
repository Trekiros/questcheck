import { NotificationSetting } from "@/model/notifications";
import { clerkClient } from "@clerk/nextjs";
import { z } from "zod";

// Discord's API has a rate limiter of 50 requests per second
const MAX_QUERIES = 49
const TIME_INTERVAL = 1000
const RETRY_INTERVAL = 100
let recentQueries = 0
async function throttler<T>(promiseGenerator: () => Promise<T>): Promise<T> {
    while (recentQueries >= MAX_QUERIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL))
    }

    recentQueries++
    setTimeout(() => recentQueries--, TIME_INTERVAL)
    return await promiseGenerator()
}

async function get<T>(endpoint: string, schema: z.ZodType<T>, options?: { onError?: Error, auth?: string }): Promise<T> {
    const res = await throttler(() => fetch(
        `https://discord.com/api${endpoint}`,
        { headers: { Authorization: options?.auth || `Bot ${process.env.DISCORD_TOKEN}` } },
    ))
    if (!res.ok) { throw options?.onError || new Error('Discord API Error on GET ' + endpoint + ": " + JSON.stringify(await res.json())) }

    const json = await res.json()
    const parsed = schema.safeParse(json)
    if (!parsed.success) throw new Error('Internal Server Error')

    return parsed.data
}

async function post(endpoint: string, payload: any, options?: { onError?: Error, auth?: string }) {
    const res = await throttler(() => fetch(
        `https://discord.com/api${endpoint}`,
        {
            headers: { 
                Authorization: options?.auth || `Bot ${process.env.DISCORD_TOKEN}`,
                "Content-Type": "application/json",
            },
            method: 'POST',
            body: JSON.stringify(payload),
        },
    ))
    if (!res.ok) { 
        throw options?.onError || new Error('Discord API Error on POST ' + endpoint + ": " + JSON.stringify(await res.json()))
    }

    return res
}

// Zod isn't strict, so these schemas aren't exhaustive - they just contain what we're interested in.
// Zod will cut all fields present in the response that aren't present in the schema
// TODO: if/when Discord implements a way to only fetch those fields, use that to reduce network load.
const DiscordGuildSchema = z.object({
    id: z.string(),
    name: z.string(),
    owner: z.boolean(),
})
const DiscordChannelSchema = z.object({
    id: z.string(),
    name: z.string(),
})
const DiscordRoleSchema = DiscordChannelSchema;

export type DiscordServer = { 
    name: string, 
    id: string, 
    channels: {name: string, id: string}[], 
    roles: {name: string, id: string}[]
}

export async function getDiscordServers(userId: string): Promise<
    { status: 'No Discord Provider' }
  | { 
        status: 'Success', 
        servers: DiscordServer[],
        discordUserId: string,
    }
> {
    // 1. Fetch installed guilds (= owned guilds with the bot on it)
    // const [clerkUser, accessTokens] = await Promise.all([
    //     clerkClient.users.getUser(userId),
    //     clerkClient.users.getUserOauthAccessToken(userId, "oauth_discord"),
    // ] as const)
    console.log('test prod - userId:', userId)
    const clerkUser = await clerkClient.users.getUser(userId)
    const accessTokens = await clerkClient.users.getUserOauthAccessToken(userId, "oauth_discord")
        .catch(e => {
            console.log('test prod - accesstoken error:', e)
            throw e
        })
    
    const discordAccount = clerkUser.externalAccounts.find(acc => acc.provider === 'oauth_discord')
    if (!discordAccount) return { status: 'No Discord Provider' }
    const discordUserId = discordAccount.externalId
    
    if (!accessTokens.length) return { status: 'No Discord Provider' }
    const accessToken = accessTokens[0].token

    const [ownedGuilds, botGuilds] = await Promise.all([
        (async () => {
            const userGuilds = await get('/users/@me/guilds', z.array(DiscordGuildSchema), { auth: `Bearer ${accessToken}` })
    
            return userGuilds
                .filter(g => !!g.owner)
                .map(g => ({ id: g.id, name: g.name }))
        })(),
        (async () => {
            const bottedGuilds = await get('/users/@me/guilds', z.array(DiscordGuildSchema))
    
            return bottedGuilds
                .map(g => ({ id: g.id, name: g.name }))
        })(),
    ] as const)
    
    const installedGuilds = ownedGuilds.filter(g1 => botGuilds.find(g2 => g1.id === g2.id))

    if (!installedGuilds.length) return { status: 'Success', servers: [], discordUserId }

    // 2. Fetch channels and roles for each installed guild
    const result: DiscordServer[] = await Promise.all(
        installedGuilds.map(async guild => {
            const [channels, roles] = await Promise.all([
                (async () => {
                    const guildChannels = await get(`/guilds/${guild.id}/channels`, z.array(DiscordChannelSchema))

                    return guildChannels.map(c => ({ id: c.id, name: c.name }))
                })(),
                (async () => {
                    const guildRoles = await get(`/guilds/${guild.id}/roles`, z.array(DiscordRoleSchema))

                    return guildRoles.map(r => ({ id: r.id, name: r.name }))
                })(),
            ])

            return { ...guild, channels, roles }
        })
    )
    
    return { status: 'Success', servers: result, discordUserId }
}


export async function discordSend(message: string, target: NotificationSetting['target']) {
    if (target.type === 'channel') {
        // https://discord.com/developers/docs/resources/channel#create-message
        const result = await post(`/channels/${target.channelId}/messages`, { 
            content: message,
            allowed_mentions: { parse: ["roles", "everyone"] },
            flags: 2, // This will remove embeds
        })
    } else {
        // https://discord.com/developers/docs/resources/user#create-dm
        const dmChannel = await post(`/users/@me/channels`, { recipient_id: target.userId })
        const json = await dmChannel.json()
        const parsed = z.object({ id: z.string() }).safeParse(json)
        if (!parsed.success) throw new Error('Internal Server Error')

        const channelId = parsed.data.id
        const result = await post(`/channels/${channelId}/messages`, { 
            content: message,
            flags: 2, // This will remove embeds
        })
    }
}
