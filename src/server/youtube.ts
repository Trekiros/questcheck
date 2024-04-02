import { clerkClient } from "@clerk/nextjs"
import { z } from "zod"

export type YoutubeInfo = (
    {
        status: 'no google provider'|'no youtube access'|'no youtube account'
    } | {
        status: 'success',
        channelId: string,
    }
)

const YoutubeResponseSchema = z.object({
    kind: z.string(),
    etag: z.string(),
    pageInfo: z.object({ totalResults: z.number(), resultsPerPage: z.number() }),
    items: z.array(z.object({
        kind: z.string(),
        etag: z.string(),
        id: z.string(),
    })).optional(),
})

export async function getYoutubeInfo(userId: string): Promise<YoutubeInfo> {
    const googleToken = (await clerkClient.users.getUserOauthAccessToken(userId, "oauth_google").catch(() => []))[0]
    if (!googleToken) return { status: "no google provider" }
    if (!googleToken.scopes?.includes("https://www.googleapis.com/auth/youtube.readonly")) return { status: "no youtube access" }
    
    const youtubeRes = await fetch("https://www.googleapis.com/youtube/v3/channels?mine=true&part=id", { headers: { Authorization: `Bearer ${googleToken.token}` } })
    if (youtubeRes.status !== 200) throw new Error('Internal Server Error: ' + youtubeRes.statusText.toString())

    const json = await youtubeRes.json()
    const parsed = YoutubeResponseSchema.safeParse(json)
    if (!parsed.success) throw new Error('Internal Server Error: ' + parsed.error.message)
    const response = parsed.data

    if (!response.items) return { status: 'no youtube account' }
    
    if (!response.items.length) throw new Error('Internal Server Error: no Youtube channel found')

    const item = response.items[0]

    return {
        status: "success",
        channelId: item.id,
    }
}