import { MongoClient, MongoClientOptions } from 'mongodb'
import migration from './migrate';
import { User } from '@/model/user';
import { Playtest } from '@/model/playtest';
import { UserReview } from '@/model/reviews';

let client: MongoClient|undefined;

/**
 * Connects to the MongoDB instance, or uses an existing connection if one already exists.
 * @returns {Promise<MongoClient>} The database client.
 */
async function getClient() {
    // In dev mode, reload the existing connection when the server is hot-reloaded
    if (process.env.NODE_ENV === "development") {
        if ((global as any).mongoClient) {
            client = (global as any).mongoClient
        }
    }

    // If the client doesn't exist yet, create it now
    if (!client) {
        const uri = process.env.MONGODB_URI
        if (!uri) {
            throw new Error("Error: no MONGODB_URI environment variable found")
        }

        const options: MongoClientOptions = {}
        client = await (new MongoClient(uri!, options)).connect()
        console.log("Connected to MongoDB!")

        // In dev, save the client in global scope so it survives hot reloading
        if (process.env.NODE_ENV === "development") {
            (global as any).mongoClient = client
        }
    }

    return client
}

async function getDB() {
    const db_name = process.env.MONGODB_DB_NAME
    if (!db_name) {
        throw new Error("Error: no MONGODB_DB_NAME environment variable found")
    }

    const client = await getClient()
    return client.db(db_name)
}


let initialized = (process.env.NODE_ENV === "development") ?
    !!(global as any).isDBInitialized
    : false
let ongoingMigration: Promise<any>|null = null
async function initialize() {
    const db = await getDB()

    if (!initialized) {
        if (!ongoingMigration) ongoingMigration = migration(db)

        await ongoingMigration
        initialized = true
        ongoingMigration = null

        if (process.env.NODE_ENV === "development") {
            (global as any).isDBInitialized = true
        }
    }

    return db
}

// By exporting this instead of the DB function, we ensure all uses are typed properly
export const Collections = {
    users: async () => (await initialize()).collection<Omit<User, '_id'>>('users'),
    bannedUsers: async () => (await initialize()).collection<{ email: string }>('bannedUsers'), // This survives even if a user deletes their data, and ensures they can't bypass a ban.

    playtests: async () => (await initialize()).collection<Omit<Playtest, '_id'>>('playtests'),

    lastCron: async () => (await initialize()).collection<{ timestamp: number }>('lastCron'),
}
