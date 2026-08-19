import { defineSecret } from 'firebase-functions/params'

/**
 * Anthropic API key for the appraisal AI-insights flow. Provisioned via
 * `firebase functions:secrets:set ANTHROPIC_API_KEY` — never hardcoded,
 * never in .env. A callable only receives the value if it declares
 * `secrets: [ANTHROPIC_API_KEY]` in its onCall options.
 */
export const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

/**
 * Fonnte WhatsApp API token — HR_OPERATIONS.md §13.1. Same provisioning story
 * as above (`firebase functions:secrets:set FONNTE_TOKEN`). Any function that
 * sends WhatsApp must declare `secrets: [FONNTE_TOKEN]` in its onCall/
 * onSchedule options, or `.value()` is empty at runtime and every send is
 * skipped (logged, never thrown — the in-app notification still lands).
 */
export const FONNTE_TOKEN = defineSecret('FONNTE_TOKEN')

/**
 * Google service-account JSON (the whole file, as one string) for the Calendar
 * Service — HR_OPERATIONS.md §13.2. The service account needs write access to
 * the shared "Nourish Executive Calendar"; the calendar's own id lives in
 * `integrations/googleCalendar`, not here, because it isn't a secret.
 */
export const GOOGLE_CALENDAR_SA_KEY = defineSecret('GOOGLE_CALENDAR_SA_KEY')
