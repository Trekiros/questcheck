import { z } from "zod";

export const UserReviewSchema = z.object({
    byUserId: z.string(),
    ofUserId: z.string(),
    duringPlaytestId: z.string(),

    rating: z.number().min(1).max(5),
    comment: z.string().max(2000),
    createdTimestamp: z.number(),
})

export type UserReview = z.infer<typeof UserReviewSchema>
