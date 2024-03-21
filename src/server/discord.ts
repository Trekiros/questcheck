import { enumMap } from "@/model/utils";
import { clerkClient } from "@clerk/nextjs";
import { ChannelType, Client as DiscordClient, Events, GatewayIntentBits } from "discord.js"
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

export async function getDiscordServers(userId: string): Promise<
    { status: 'No Discord Provider' }
  | { 
        status: 'Success', 
            servers: { 
            name: string, 
            id: string, 
            channels: {name: string, id: string}[], 
            roles: {name: string, id: string}[]
        }[]
    }
> {
    async function getOwnedServers(userId: string): Promise<
        { status: 'No Discord Provider' }
      | { status: 'Success', servers: { name: string, id: string }[] }
    > {
        const accessTokens = await clerkClient.users.getUserOauthAccessToken(userId, "oauth_discord")
        if (!accessTokens.length) return { status: 'No Discord Provider' }
    
        const accessToken = accessTokens[0].token
    
        // TODO: handle "you are being rate limited" error
        const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", { headers: { Authorization: `Bearer ${accessToken}` } })
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
    
        return { status: 'Success', servers: ownedGuilds }    
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

    const guilds = discordClient.value.guilds.cache

    const installedServers = ownedServers.value.servers.filter(server => guilds.has(server.id))
    const [channelsLists, rolesList] = await Promise.all([
        Promise.all(installedServers.map(server => guilds.get(String(server.id))!.channels.fetch())),
        Promise.all(installedServers.map(server => guilds.get(String(server.id))!.roles.fetch())),
    ] as const)

    const channelsByServer: { [serverId: string]: { id: string, name: string }[] } = enumMap(
        installedServers.map(server => server.id),
        (_, index) => channelsLists[index]
            .filter(channel => channel!.type === ChannelType.GuildText)
            .map(channel => ({ name: channel!.name, id: channel!.id })),
    )

    const rolesByServer: { [serverId: string]: { id: string, name: string }[] } = enumMap(
        installedServers.map(server => server.id),
        (_, index) => rolesList[index]
          .map(role => ({ name: role.name, id: role.id })),
    )

    const serversWithChannels = installedServers.map(({ id, name }) => ({ 
        id,
        name,
        channels: channelsByServer[id],
        roles: rolesByServer[id],
    }))
    
    return { status: 'Success', servers: serversWithChannels }
}


export async function discordSend(message: string, targets: {[serverId: string]: string /* channelId */}) {
    const discordClient = await getDiscordClient()

    //discordClient.
}
