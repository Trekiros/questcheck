import { z } from "zod";
import { PlaytestSearchParamSchema } from "./playtest";
import { enumMap } from "./utils";

export const NotificationFrequencyList = ['Whenever a playtest is created', 'Once per day'] as const
export const NotificationFrequencySchema = z.enum(NotificationFrequencyList)
export type NotificationFrequency = z.infer<typeof NotificationFrequencySchema>

export const NotificationTargetTypeList = ['dm', 'channel'] as const
export const NotificationTargetTypeSchema = z.enum(NotificationTargetTypeList)
export type NotificationTargetType = z.infer<typeof NotificationTargetTypeSchema>
export const NotificationTargetTypeMap: {[key in NotificationTargetType]: string} = {
    channel: "Message in a text channel in a server you own",
    dm: "Send you a private message"
}

export const NotificationTargetSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("dm"),
        userId: z.string(),
    }),
    z.object({
        type: z.literal("channel"),
        serverId: z.string().min(1).max(30),
        channelId: z.string().min(1).max(30),
        role: z.string().max(30).optional(), // If present, the bot will ping this role
    }),
])

export const NotificationSettingSchema = z.object({
    name: z.string().max(100),
    target: NotificationTargetSchema,
    frequency: NotificationFrequencySchema,
    filter: PlaytestSearchParamSchema,
})
export type NotificationSetting = z.infer<typeof NotificationSettingSchema>
