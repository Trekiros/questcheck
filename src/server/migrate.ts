import { Db } from "mongodb"

/**
 * Runs migration scripts if necessary.
 * The migration should only be executed once, even if the server is shut down and then brought back up again.
 * Don't forget to remove migrations which have already been executed in prod
 */
export default async function migration(db: Db) {
    /*await performMigration('character.campaignId', async () => {
        await db.collection<Sheet>('characters').updateMany({
            'campaignId': { $exists: false },
        }, {
            $set: { 'campaignId': "" },
        })
    })*/



    
    
    async function performMigration(name: string, callback: () => Promise<void>) {
        const upsertResult = await db.collection<{ name: string, done: boolean }>('migrations').updateOne({ name }, { $set: { done: true } }, { upsert: true })

        if (!upsertResult.upsertedId) {
            console.log(`Migration: skipping ${name} because it has already been performed`)
            return
        }

        console.log(`Migration: executing ${name}`)
        await callback()
        console.log(`Migration: executed ${name} successfully`)
    }
}
