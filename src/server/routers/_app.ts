import { router } from '../trpc/trpc'
import { userRouter } from './user'
import { equipmentRouter } from './equipment'
import { quotesRouter } from './quotes'
import { companiesRouter, contactsRouter } from './companies'
import { inlandRouter } from './inland'

export const appRouter = router({
  user: userRouter,
  equipment: equipmentRouter,
  quotes: quotesRouter,
  companies: companiesRouter,
  contacts: contactsRouter,
  inland: inlandRouter,
})

export type AppRouter = typeof appRouter
