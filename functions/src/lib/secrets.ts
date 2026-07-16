import { defineSecret } from 'firebase-functions/params'

/**
 * Anthropic API key for the appraisal AI-insights flow. Provisioned via
 * `firebase functions:secrets:set ANTHROPIC_API_KEY` — never hardcoded,
 * never in .env. A callable only receives the value if it declares
 * `secrets: [ANTHROPIC_API_KEY]` in its onCall options.
 */
export const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
