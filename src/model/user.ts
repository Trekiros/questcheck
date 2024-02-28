import { z } from "zod";

export const UserSchema = z.object({
    userId: z.string(), // Clerk user id
    userName: z.string(),
    
})

export type User = z.infer<typeof UserSchema>
