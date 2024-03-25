import { doCron } from '@/server/routers/cron'
import type { NextApiRequest, NextApiResponse } from 'next'
 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }
    
    try {
        await doCron()
        res.status(200).json({ status: 'ok' })
    } catch (err) {
        console.error(err)
        res.status(400).json({ status: 'ko' })
    }
}
