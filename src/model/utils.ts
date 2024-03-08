import { ZodSchema } from "zod";

/**
 * Validates the given object, logs the errors if it finds any, and returns a map of errors so the UI can be updated accordingly.
 * @param obj the object to validate
 * @param schema the schema to use for validation
 * @returns 
 *   * isValid: a boolean indicating whether or not the object is valid
 *   * errorPaths: an object map, showing the different invalid properties, e.g. `{ item.name: true }`
 */
export function validate<T>(obj: T, schema: ZodSchema<T>) {
    const parsed = schema.safeParse(obj)
    const isValid = parsed.success

    type AllPossibleKeys<T2> = T2 extends T2 ? keyof T2: never;

    const errorPaths: { [K in AllPossibleKeys<T>]?: true } = {}
    if (!isValid) {
        console.warn(
            "Invalid:", obj,
            "issues:", ...parsed.error.issues.map(issue => ({
                code: issue.code,
                path: issue.path.join('.'),
                ...( ('expected' in issue) ? {
                    message: `expected ${issue.expected}, received ${issue.received}`,
                } : {})
            })),
        )
        for (let issue of parsed.error.issues) {
            const path = issue.path[0];
            (errorPaths as any)[path] = true
        }
    }

    return { isValid, errorPaths }
}

export type Prettify<T> = { [K in keyof T]: T[K] } & {}

type PojoMap<K extends PropertyKey, V> = {[key in K]: V}

export function pojoMap<K extends PropertyKey, V>(obj: {[key in K]: any}, mapper: (key: K, index: number) => V) {
    const map: {[key in K]: V} = {} as any
    
    let i = 0
    for (let key in obj) {
        map[key] = mapper(key, i)
        i++
    }

    return map
}

export function arrMap<K extends PropertyKey, V>(arr: V[], mapper: (value: V, index: number) => K) {
    const map: {[key in K]: V} = {} as any

    let i = 0
    for (let value of arr) {
        map[mapper(value, i)] = value
        i++
    }

    return map
}

export function enumMap<K extends PropertyKey, V>(arr: readonly K[], mapper: (key: K, index: number) => V) {
    const map: {[key in K]: V} = {} as any

    let i = 0
    for (let key of arr) {
        map[key] = mapper(key, i)
        i++
    }

    return map
}

export const isAlphanumeric = (str: string) => {
    if (typeof str !== "string") return false;

    return !str.length || /^[a-zA-Z0-9]+$/.test(str)
}

// Bypasses the fact that Object.keys and for in aren't typed properly.
// DELETE THIS when TypeScript finally types those things.
export const keys: <T extends object>(obj: T) => (keyof T)[] = Object.keys as any
