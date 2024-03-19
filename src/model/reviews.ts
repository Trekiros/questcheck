import { z } from "zod";

export const UserReviewSchema = z.object({
    byUserId: z.string().max(64),
    duringPlaytestId: z.string().max(64),

    rating: z.number().min(1).max(5),
    comment: z.string().max(300),
    createdTimestamp: z.number(),
})

export type UserReview = z.infer<typeof UserReviewSchema>
