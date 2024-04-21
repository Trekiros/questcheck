import { doCron } from '@/server/routers/cron'
import type { NextApiRequest, NextApiResponse } from 'next'
 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (
      !process.env.CRON_SECRET ||
      (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)
    ) {
      return res.status(401).json({ success: false });
    }
    
    try {
        await doCron()
        res.status(200).json({ success: true })
    } catch (err) {
        console.error("Error during cron job: " + String(err))
        res.status(400).json({ success: false })
    }
}
