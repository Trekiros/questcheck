import { NotificationSetting } from "@/model/notifications";
import { clerkClient } from "@clerk/nextjs";
import { ChannelType, Collection, Client as DiscordClient, Events, Guild, MessageCreateOptions, MessagePayload, OAuth2Guild } from "discord.js"
import { z } from "zod";

let client: DiscordClient<true>|null = null

export async function getDiscordClient() {
    // In dev mode, reload the existing connection when the server is hot-reloaded
    if (process.env.NODE_ENV === "development") {
        if ((global as any).discordClient) {
            client = (global as any).discordClient
        }
    }

    // Try to use the existing client if one is available
    if (client !== null) return client;


    // Otherwise, create a new client
    if (!process.env.DISCORD_TOKEN) throw new Error('No Discord token available')

    const clientBuilder = new DiscordClient<false>({
        intents: [],
    })

    client = await new Promise<DiscordClient<true>>(resolve => {
        clientBuilder.once(Events.ClientReady, readyClient => resolve(readyClient))

        clientBuilder.login(process.env.DISCORD_TOKEN)
    })

    // In dev mode, save the existing connection in the global stat so it persists when the server is hot-reloaded
    if (process.env.NODE_ENV === "development") {
        (global as any).discordClient = client
    }
    
    return client
}


const DiscordGuildSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().or(z.null()),
    owner: z.boolean(),
    permissions: z.number(),
    features: z.array(z.string()),
    approximate_member_count: z.number().optional(),
    approximate_presence_count: z.number().optional(),
})

export type DiscordServer = { 
    name: string, 
    id: string, 
    channels: {name: string, id: string}[], 
    roles: {name: string, id: string}[]
}

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

// The cache from discordjs' client doesn't actually contain what is needed to fetch channels & roles for some reason, so here's a custom cache instead
let guildCache: Collection<string, OAuth2Guild>|null = null;
let ongoingGuildsQuery: Promise<Collection<string, OAuth2Guild>>|null = null;
async function getGuilds(): Promise<Collection<string, OAuth2Guild>> {
    if (guildCache) return guildCache

    const discordClient = await getDiscordClient()
    if (!ongoingGuildsQuery) ongoingGuildsQuery = new Promise(async resolve => {
        const result = await throttler(() => discordClient.guilds.fetch())
        ongoingGuildsQuery = null;
        guildCache = result
        resolve(result)
    })

    return await ongoingGuildsQuery
}

export async function getDiscordServers(userId: string): Promise<
    { status: 'No Discord Provider' }
  | { 
        status: 'Success', 
        servers: DiscordServer[],
        discordUserId: string,
    }
> {
    async function getOwnedServers(userId: string): Promise<
        { status: 'No Discord Provider' }
      | { status: 'Success', servers: { name: string, id: string }[], discordUserId: string }
    > {
        const clerkUser = await clerkClient.users.getUser(userId)
        const discordAccount = clerkUser.externalAccounts.find(acc => acc.provider === 'oauth_discord')
        if (!discordAccount) return { status: 'No Discord Provider' }
        const discordUserId = discordAccount.externalId

        const accessTokens = await clerkClient.users.getUserOauthAccessToken(userId, "oauth_discord")
        if (!accessTokens.length) return { status: 'No Discord Provider' }
    
        const accessToken = accessTokens[0].token
    
        const guildsRes = await throttler(() => fetch("https://discord.com/api/users/@me/guilds", { headers: { Authorization: `Bearer ${accessToken}` } }))
        if (guildsRes.status !== 200) {
            throw new Error('Invalid Discord access token')
        }
    
        const json = await guildsRes.json()
        const parsed = z.array(DiscordGuildSchema).safeParse(json)
        if (!parsed.success) {
            throw new Error('Internal Server Error')
        }
    
        const guilds = parsed.data
        const ownedGuilds = guilds.filter(g => g.owner)
            .map(g => ({ name: g.name, id: g.id }))
    
        return { status: 'Success', servers: ownedGuilds, discordUserId }    
    }

    const [ownedServers, discordClient] = await Promise.allSettled([
        getOwnedServers(userId),
        getDiscordClient(),
    ] as const)

    if (ownedServers.status === 'rejected') {
        throw new Error('Internal Server Error', ownedServers.reason)
    }
    if (discordClient.status === 'rejected') {
        throw new Error('Internal Server Error', discordClient.reason)
    }

    if (ownedServers.value.status === 'No Discord Provider') {
        return ownedServers.value
    }

    const ownedServerIds = ownedServers.value.servers.map(server => server.id)    
    const guilds = await getGuilds()
    const installedServerIds = ownedServerIds.filter(serverId => guilds.has(serverId))
    
    const installedServers = await Promise.all(
        installedServerIds.map(serverId => throttler(async () => {
            const guild = await throttler(() => guilds.get(serverId)!.fetch())
            const channels = await throttler(() => guild.channels.fetch())
            const roles = await throttler(() => guild.roles.fetch())

            return {
                name: guild.name,
                id: guild.id,

                channels: channels
                    .filter(c => c !== null && c.type === ChannelType.GuildText)
                    .map(c => ({ name: c!.name, id: c!.id })),
                
                roles: roles.map(r => ({ name: r.name, id: r.id })),
            }
        }))
    )
    
    return { status: 'Success', servers: installedServers, discordUserId: ownedServers.value.discordUserId }
}


export async function discordSend(message: string | MessagePayload | MessageCreateOptions, target: NotificationSetting['target']) {
    if (target.type === 'channel') {
        const guilds = await throttler(() => getGuilds())
        const guild = guilds.get(target.serverId)

        if (!guild) {
            return console.log('Guild not found!')
        }

        const channel = guild.client.channels.cache.get(target.channelId)
        
        if (!channel) {
            return console.log('channel not found!')
        }

        if (channel.type === ChannelType.GuildText) {
            await throttler(() => channel.send(message))
        }
    } else {
        // TODO private message to the specified user
        const discordClient = await getDiscordClient()
        
        
    }
}
