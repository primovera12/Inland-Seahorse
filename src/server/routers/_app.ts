import { router } from '../trpc/trpc'
import { userRouter } from './user'
import { equipmentRouter } from './equipment'
import { quotesRouter } from './quotes'
import { companiesRouter, contactsRouter } from './companies'
import { inlandRouter } from './inland'
import { dashboardRouter } from './dashboard'
import { activityRouter } from './activity'
import { remindersRouter } from './reminders'
import { reportsRouter } from './reports'
import { searchRouter } from './search'

export const appRouter = router({
  user: userRouter,
  equipment: equipmentRouter,
  quotes: quotesRouter,
  companies: companiesRouter,
  contacts: contactsRouter,
  inland: inlandRouter,
  dashboard: dashboardRouter,
  activity: activityRouter,
  reminders: remindersRouter,
  reports: reportsRouter,
  search: searchRouter,
})

export type AppRouter = typeof appRouter
