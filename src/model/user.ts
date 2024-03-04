import { z } from "zod";
import { Prettify } from "./utils";

export const isAlphanumeric = (str: string) => {
    if (typeof str !== "string") return false;

    return !str.length || /^[a-zA-Z0-9]+$/.test(str)
}

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
         })).max(20),
    }),

    publisherProfile: z.object({
        // WARNING: READONLY. THE USER SHOULD NOT BE ALLOWED TO UPDATE THIS DIRECTLY
        twitterProof: z.string().optional(),
        facebookProof: z.string().optional(),
        manualProof: z.boolean().optional(),
    }),
})

export type User = z.infer<typeof UserSchema>

export const MutableUserSchema = UserSchema.omit({ userId: true, userNameLowercase: true })
export type MutableUser = Prettify<z.infer<typeof MutableUserSchema>>

export const newUser = {
    userName: '',
    userBio: '',
    isPlayer: false,
    isPublisher: false,

    playerProfile: {
        systems: [],
    },

    publisherProfile: {
        
    },
} satisfies Omit<User, "userId"|'userNameLowercase'>
