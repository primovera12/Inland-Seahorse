import { router } from '../trpc/trpc'
import { userRouter } from './user'
import { equipmentRouter } from './equipment'
import { quotesRouter } from './quotes'
import { companiesRouter, contactsRouter } from './companies'

export const appRouter = router({
  user: userRouter,
  equipment: equipmentRouter,
  quotes: quotesRouter,
  companies: companiesRouter,
  contacts: contactsRouter,
})

export type AppRouter = typeof appRouter
