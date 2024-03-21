import { router } from '../trpc' 
import { CronRouter } from './cron';
import { PlaytestRouter } from './playtests';
import { UserRouter } from './users';

export const appRouter = router({
	playtests: PlaytestRouter,
	users: UserRouter,
	cron: CronRouter,
})

export type AppRouter = typeof appRouter;
