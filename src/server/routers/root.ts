import { router } from '../trpc' 
import { PlaytestRouter } from './playtests';
import { UserRouter } from './users';

export const appRouter = router({
	playtests: PlaytestRouter,
	users: UserRouter,
})

export type AppRouter = typeof appRouter;
