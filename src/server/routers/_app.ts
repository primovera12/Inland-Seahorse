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
import { emailRouter } from './email'
import { templatesRouter } from './templates'
import { notificationsRouter } from './notifications'
import { importRouter } from './import'
import { settingsRouter } from './settings'
import { feedbackRouter } from './feedback'
import { sequencesRouter } from './sequences'
import { analyticsRouter } from './analytics'
import { rateCardsRouter } from './rateCards'

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
  email: emailRouter,
  templates: templatesRouter,
  notifications: notificationsRouter,
  import: importRouter,
  settings: settingsRouter,
  feedback: feedbackRouter,
  sequences: sequencesRouter,
  analytics: analyticsRouter,
  rateCards: rateCardsRouter,
})

export type AppRouter = typeof appRouter
