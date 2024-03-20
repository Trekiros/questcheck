import { z } from "zod";

export const UserReviewSchema = z.object({
    byUserId: z.string().max(64),
    duringPlaytestId: z.string().max(64),

    endorsed: z.boolean(),
    comment: z.string().max(300),
    createdTimestamp: z.number(),
})
export type UserReview = z.infer<typeof UserReviewSchema>


export const ReviewInputSchema = UserReviewSchema
    .omit({ byUserId: true, createdTimestamp: true })
    .refine(({ comment, endorsed }) =>  comment || endorsed) // A review must at least contain either an endorsement or a comment. It can contain both.

export type ReviewInput = z.infer<typeof ReviewInputSchema>