import { doCron } from '@/server/routers/cron'
import type { NextApiRequest, NextApiResponse } from 'next'
 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('Cron endpoint un-authorized')
        return res.status(401).end('Unauthorized');
    }
    
    try {
        await doCron()
        res.status(200).json({ status: 'ok' })
    } catch (err) {
        console.error("Error during cron job: " + String(err))
        res.status(400).json({ status: 'ko' })
    }
}
