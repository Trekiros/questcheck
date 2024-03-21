import { doCron } from '@/server/routers/cron'
import type { NextApiRequest, NextApiResponse } from 'next'
 
export default async function handler(_: NextApiRequest, res: NextApiResponse) {
    try {
        await doCron()
        res.status(200).json({ status: 'ok' })
    } catch (err) {
        console.log(err)
        res.status(400).json({ status: 'ko' })
    }
}