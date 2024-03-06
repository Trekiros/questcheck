import { z } from "zod";
import { Prettify } from "./utils";

export const TaskList = ['Read-through + Feedback', 'One Shot ran by the Publisher', 'One Shot ran by the Playtester', 'Campaign ran by the Publisher', 'Campaign ran by the Playtester'] as const
export const TaskSchema = z.enum(TaskList)
export type Task = z.infer<typeof TaskSchema>

export const BountyList = ['Name credits only', 'Discount Code', 'Gift Card', 'Free PDF', 'Free Hardcover Copy', 'Payment'] as const
export const BountySchema = z.enum(BountyList)
export type Bounty = z.infer<typeof BountySchema>

export const PlaytestSchema = z.object({
    // Readonly
    _id: z.string(),
    userId: z.string(),
    createdTimestamp: z.number(),


    name: z.string().min(4).max(128),
    description: z.string().max(2000),
    privateDescription: z.string().max(600),
    tags: z.array(z.string().min(1).max(64)).max(20),
    maxPositions: z.number().optional(),
    feedbackURL: z.string().url().min(1),

    applicationDeadline: z.number().min(1),
    closedManually: z.boolean(),

    scheduleDate: z.number().optional(),
    scheduleTimeStart: z.number().optional(),
    scheduleTimeEnd: z.number().optional(),

    bounty: BountySchema,
    bountyDetails: z.string().max(300),
    bountyContract: z.discriminatedUnion('type', [
        z.object({ type: z.literal('template'), templateValues: z.record(z.string().max(64), z.string().max(200)), useNDA: z.boolean() }),
        z.object({ type: z.literal('custom'), text: z.string().max(5000) })
    ]),

    task: TaskSchema,
})

export type Playtest = z.infer<typeof PlaytestSchema>

export const MutablePlaytestSchema = PlaytestSchema.omit({ _id: true, userId: true, createdTimestamp: true })
export type MutablePlaytest = Prettify<z.infer<typeof MutablePlaytestSchema>>

export const newPlaytest = {
    name: '',
    description: '',
    privateDescription: '',
    feedbackURL: '',
    tags: [],
    applicationDeadline: 0,
    closedManually: false,
    bounty: 'Name credits only',
    bountyDetails: '',
    bountyContract: { type: 'template', templateValues: {}, useNDA: false },
    task: 'Read-through + Feedback',
} satisfies MutablePlaytest






// Search Params
export const DaysList = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const DaysSchema = z.enum(DaysList)
export type Days = z.infer<typeof DaysSchema>

export const PlaytestSearchParamSchema = z.object({
    includeAuthors: z.array(z.string()),
    excludeAuthors: z.array(z.string()),

    includeTags: z.array(z.string()),
    excludeTags: z.array(z.string()),
    
    before: z.number(),
    after: z.number(),
    beforeHour: z.number(),
    afterHour: z.number(),
    daysOfTheWeek: z.array(DaysSchema),

    acceptableBounties: z.record(BountySchema, z.boolean()),
    acceptableTasks: z.record(TaskSchema, z.boolean()),
}).partial()

export type PlaytestSearchParams = z.infer<typeof PlaytestSearchParamSchema>

export const DefaultSearchParams: PlaytestSearchParams = {}