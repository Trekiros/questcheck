import { z } from "zod";
import { Prettify, isAlphanumeric } from "./utils";
import { UserReviewSchema } from "./reviews";
import { NotificationSettingSchema } from "./notifications";

export const SystemFamiliarityList = [
    'Is interested in',
    'Has played',
    'Has ran at least 1 game',
    'Has ran at least 1 full campaign',
    'Has published content for',
] as const
export const SystemFamiliaritySchema = z.enum(SystemFamiliarityList)
export type SystemFamiliarity = z.infer<typeof SystemFamiliaritySchema>

export const SystemNameSchema = z.string().min(2).max(64)




export const UserSchema = z.object({
    userId: z.string(), // Clerk user id
    banned: z.boolean().optional(), // Just in case.
    emails: z.array(z.string().email()), // Set based on the clerk user account email on creation

    userName: z.string().min(4).max(50).refine(isAlphanumeric, { message: "Username should be alphanumeric" }),
    userNameLowercase: z.string(), // Readonly index to check if user name is taken
    
    userBio: z.string().max(600),
    isPlayer: z.boolean(),
    isPublisher: z.boolean(),

    playerProfile: z.object({
        systems: z.array(z.object({
            system: SystemNameSchema, 
            familiarity: z.number().min(1).max(5),
            details: z.string().max(300),
        })).max(10),
        notifications: z.array(NotificationSettingSchema).max(20),
        dmOnAccept: z.string().optional(),
        dmOnApply: z.string().optional(),
    }),

    // Readonly
    playerReviews: z.array(UserReviewSchema),

    publisherProfile: z.object({
        // WARNING: READONLY. THE USER SHOULD NOT BE ALLOWED TO UPDATE THIS DIRECTLY
        twitterProof: z.string().optional(),
        youtubeProof: z.string().optional(),
        manualProof: z.string().optional(),
    }),
})

export type User = z.infer<typeof UserSchema>



// These are the fields a user is allowed to update
export const MutableUserSchema = UserSchema.omit({ userId: true, userNameLowercase: true, banned: true, emails: true, playerReviews: true })
export type MutableUser = Prettify<z.infer<typeof MutableUserSchema>>

export const newUser = {
    userName: '',
    userBio: '',
    isPlayer: false,
    isPublisher: false,

    playerProfile: {
        systems: [],
        notifications: [],
    },

    publisherProfile: {
        
    },
} satisfies MutableUser


// These are the fields another user is allowed to see
export const PublicUserSchema = UserSchema.omit({ userNameLowercase: true, emails: true, playerReviews: true })
export type PublicUser = z.infer<typeof PublicUserSchema>
