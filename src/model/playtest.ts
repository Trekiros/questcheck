import { z } from "zod";
import { Prettify } from "./utils";

export const TaskList = ['readthrough', 'one shot', 'multiple sessions'] as const
export const TaskSchema = z.enum(TaskList)
export type Task = z.infer<typeof TaskSchema>

export const BountyList = ['none', 'discount', 'gift card', 'cash'] as const
export const BountySchema = z.enum(BountyList)
export type Bounty = z.infer<typeof BountySchema>

export const PlaytestSchema = z.object({
    // Readonly
    userId: z.string(),
    createdTimestamp: z.number(), 

    
    name: z.string().min(4).max(128),
    description: z.string().max(2000),
    tags: z.array(z.string().min(1).max(64)),

    applicationDeadline: z.number(),
    closedManually: z.boolean(),

    scheduleDate: z.number().optional(),
    scheduleTimeStart: z.number().optional(),
    scheduleTimeEnd: z.number().optional(),

    bounty: BountySchema,
    bountyDetails: z.string().max(300),

    task: TaskSchema,
})

export type Playtest = z.infer<typeof PlaytestSchema>

export const MutablePlaytestSchema = PlaytestSchema.omit({ userId: true, createdTimestamp: true })
export type MutablePlaytest = Prettify<z.infer<typeof MutablePlaytestSchema>>

export const newPlaytest = {
    name: '',
    description: '',
    tags: [],
    applicationDeadline: Infinity,
    closedManually: false,
    bounty: 'none',
    bountyDetails: '',
    task: 'readthrough',
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