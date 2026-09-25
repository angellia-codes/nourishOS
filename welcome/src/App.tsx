import { useCallback, useEffect, useMemo, useState } from 'react'
import { Spinner } from './ui'
import { FormPage } from './pages/FormPage'
import { HomePage, type HomeSection } from './pages/HomePage'
import { SectionPage, type SectionKey } from './pages/SectionPage'
import { InvalidPage } from './pages/InvalidPage'
import { STRINGS, detectLang, t, type Lang } from './strings'
import { clearCachedDraft, readToken } from './token'
import { getWelcomeContent, getWelcomeSession, type WelcomeContent, type WelcomeSession } from './api'

/**
 * NourishOS New-Hire Welcome Portal — welcome-portal.md §7.3.
 *
 * Deliberately no router. The candidate portal uses react-router because it
 * has seven addressable screens a candidate navigates between and returns to;
 * this app has one URL (the magic link) and a handful of views behind it.
 * Adding routes would put the token in the address bar on every navigation,
 * which is the one thing a credential should not be.
 *
 * Which view shows is decided by the invite, not by the hire:
 *  - no token, or the server refuses it → the single invalid-link screen (§11)
 *  - not yet submitted → the form
 *  - submitted or verified → the welcome banner and the content sections
 *
 * A rejection re-opens the form (§3.4), which is why `view` can be pushed back
 * to 'form' from Home rather than being derived from status alone.
 */

type View = 'form' | 'home' | 'section'

const NAV: { key: 'home' | 'about' | 'standards' | 'menu'; label: keyof typeof STRINGS }[] = [
  { key: 'home', label: 'navHome' },
  { key: 'about', label: 'navAbout' },
  { key: 'standards', label: 'navStandards' },
  { key: 'menu', label: 'navMenu' },
]

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang)
  const [token] = useState<string | null>(readToken)
  const [session, setSession] = useState<WelcomeSession | null>(null)
  const [content, setContent] = useState<WelcomeContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('home')
  const [section, setSection] = useState<SectionKey>('profile')

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // §9's performance guardrail: pause the drifting background when the tab is
  // hidden. An animation nobody is looking at is pure battery on a mid-range
  // Android, which is the device this app is actually read on.
  useEffect(() => {
    const apply = () => document.body.classList.toggle('w-drift', !document.hidden)
    apply()
    document.addEventListener('visibilitychange', apply)
    return () => {
      document.removeEventListener('visibilitychange', apply)
      document.body.classList.remove('w-drift')
    }
  }, [])

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await getWelcomeSession(token)
      setSession(next)
      setView(next.submitted ? 'home' : 'form')
      setError(null)
      // Content is a nice-to-have; a hire who cannot read the menu should
      // still reach their welcome card.
      try {
        setContent(await getWelcomeContent(token))
      } catch {
        setContent(null)
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const sections = useMemo<HomeSection[]>(
    () => [
      { key: 'profile', title: t(STRINGS.secProfile, lang), blurb: t(STRINGS.appName, lang) },
      { key: 'values', title: t(STRINGS.secValues, lang), blurb: 'INSPIRE' },
      { key: 'grooming', title: t(STRINGS.secGrooming, lang), blurb: t(STRINGS.navStandards, lang) },
      { key: 'dosDonts', title: t(STRINGS.secDosDonts, lang), blurb: t(STRINGS.navStandards, lang) },
      { key: 'attendance', title: t(STRINGS.secAttendance, lang), blurb: t(STRINGS.navStandards, lang) },
      { key: 'orgChart', title: t(STRINGS.secOrgChart, lang), blurb: t(STRINGS.navAbout, lang) },
      { key: 'menu', title: t(STRINGS.secMenu, lang), blurb: t(STRINGS.navMenu, lang) },
    ],
    [lang],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
        <span className="w-sr-only">{t(STRINGS.loading, lang)}</span>
      </div>
    )
  }

  // §11 — one screen, one message, whatever actually went wrong.
  if (!token || (!session && error !== null)) {
    return <InvalidPage lang={lang} message={error ?? undefined} />
  }
  if (!session) return <InvalidPage lang={lang} />

  function openSection(key: string) {
    setSection(key as SectionKey)
    setView('section')
  }

  function openNav(key: (typeof NAV)[number]['key']) {
    if (key === 'home') {
      setView('home')
      return
    }
    // The spec's five mobile tabs group the seven sections; with Feedback out
    // of scope this is four, and each non-Home tab opens its group's first
    // section rather than an intermediate index nobody asked for.
    openSection(key === 'about' ? 'profile' : key === 'standards' ? 'grooming' : 'menu')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 pt-4">
        <p className="text-sm font-semibold tracking-tight">{t(STRINGS.appName, lang)}</p>
        <LangToggle lang={lang} onChange={setLang} />
      </header>

      <main className="flex-1">
        {view === 'form' ? (
          <FormPage
            token={token}
            lang={lang}
            initialDraft={session.draft}
            rejectionReason={session.rejectionReason}
            onSubmitted={(fullName) => {
              clearCachedDraft()
              setSession({ ...session, fullName, submitted: true, onboardingStatus: 'submitted', rejectionReason: null })
              setView('home')
            }}
          />
        ) : null}

        {view === 'home' ? (
          <HomePage
            lang={lang}
            fullName={session.fullName}
            verified={session.onboardingStatus === 'verified'}
            // §3.4 — a rejected verification unlocks the invite and puts the
            // hire back at 'invited' with a reason, which is the one case where
            // a submitted form becomes editable again.
            rejectionReason={session.rejectionReason}
            sections={sections}
            onOpenSection={openSection}
            onOpenForm={() => setView('form')}
          />
        ) : null}

        {view === 'section' ? (
          <SectionPage section={section} content={content} lang={lang} onBack={() => setView('home')} />
        ) : null}
      </main>

      {/* The form owns the whole screen while it is open — its own sticky
          submit bar sits where this nav would, and two stacked bars on a
          360px phone leaves nothing to type into. */}
      {view === 'form' ? null : (
        <nav
          className="sticky bottom-0 z-10 flex border-t border-[var(--w-glass-border)] bg-[var(--w-glass-strong)] backdrop-blur-md"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => openNav(item.key)}
              className="w-focusable min-h-[56px] flex-1 px-2 text-xs font-semibold text-[var(--w-cream-soft)]"
            >
              {t(STRINGS[item.label], lang)}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (next: Lang) => void }) {
  return (
    <div className="flex overflow-hidden rounded-full border border-[var(--w-glass-border)]" role="group" aria-label="Language">
      {(['id', 'en'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => onChange(value)}
          className={`w-focusable min-h-[36px] px-3 text-xs font-semibold uppercase ${
            lang === value ? 'bg-[var(--w-amber)] text-[var(--w-ink)]' : 'text-[var(--w-cream-soft)]'
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  )
}
