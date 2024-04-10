import { Playtest } from "@/model/playtest"
import { User } from "@/model/user"
import { Db, UpdateResult } from "mongodb"

/**
 * Runs migration scripts if necessary.
 * The migration should only be executed once, even if the server is shut down and then brought back up again.
 * Don't forget to remove migrations which have already been executed in prod
 */
export default async function migration(db: Db) {
    // await performMigration('player profile now has a credit name', async () => {
    //     return await db.collection<User>('users').updateMany({
    //         "playerProfile.creditName": { $exists: false },
    //     },
    //     [{
    //         $set: { "playerProfile.creditName": "$userName" },
    //     }])
    // })



    
    
    async function performMigration(name: string, callback: () => Promise<UpdateResult<any>>) {
        const upsertResult = await db.collection<{ name: string, done: boolean }>('migrations').updateOne({ name }, { $set: { done: true } }, { upsert: true })

        if (!upsertResult.upsertedId) {
            console.log(`Migration: skipping ${name} because it has already been performed`)
            return
        }

        console.log(`Migration: executing ${name}`)
        const result = await callback()
        console.log(`Migration: executed ${name} successfully. ${result.modifiedCount} documents updated.`)
    }
}

