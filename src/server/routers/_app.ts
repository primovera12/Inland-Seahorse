import { router } from '../trpc/trpc'
import { userRouter } from './user'
import { equipmentRouter } from './equipment'
import { quotesRouter } from './quotes'
import { companiesRouter, contactsRouter } from './companies'
import { inlandRouter } from './inland'
import { dashboardRouter } from './dashboard'
import { activityRouter } from './activity'

export const appRouter = router({
  user: userRouter,
  equipment: equipmentRouter,
  quotes: quotesRouter,
  companies: companiesRouter,
  contacts: contactsRouter,
  inland: inlandRouter,
  dashboard: dashboardRouter,
  activity: activityRouter,
})

export type AppRouter = typeof appRouter
