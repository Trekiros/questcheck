import { z } from "zod";

export const isAlphanumeric = (str: string) => {
    if (typeof str !== "string") return false;

    return !str.length || /^[a-zA-Z0-9]+$/.test(str)
}

export const SystemFamiliarityList = [
    'Is interested in',
    'Has played',
    'Has ran at least 1 game',
    'Has ran at least 1 full campaign',
    'Has published homebrew content for',
    'Has published commercial content for',
] as const
export const SystemFamiliaritySchema = z.enum(SystemFamiliarityList)
export type SystemFamiliarity = z.infer<typeof SystemFamiliaritySchema>

export const SystemNameSchema = z.string().min(2).max(64)

export const UserSchema = z.object({
    userId: z.string(), // Clerk user id
    
    userName: z.string().min(4).refine(isAlphanumeric, { message: "Username should be alphanumeric" }),
    
    userBio: z.string().max(600),
    isPlayer: z.boolean(),
    isPublisher: z.boolean(),

    playerProfile: z.object({
        systems: z.array(z.object({ system: SystemNameSchema, familiarity: SystemFamiliaritySchema })),
    })
})

export type User = z.infer<typeof UserSchema>

export function newUser(): Omit<User, "userId"> {
    return {
        userName: '',
        userBio: '',
        isPlayer: false,
        isPublisher: false,

        playerProfile: {
            systems: [],
        },
    }
}
