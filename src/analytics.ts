// Anonymous visit counting with GoatCounter (no cookies, no personal data, no cross-site tracking).
// Leave GOATCOUNTER_CODE empty to turn counting off. To turn it on, create a free site at
// goatcounter.com, put its code here (for "https://fitlab.goatcounter.com" the code is "fitlab").
export const GOATCOUNTER_CODE: string = 'fitlab'

interface GoatCounter {
  count?: (opts: { path: string; title?: string; event?: boolean }) => void
}
declare global {
  interface Window {
    goatcounter?: GoatCounter & { no_onload?: boolean }
  }
}

export const analyticsOn = () => GOATCOUNTER_CODE !== ''

export function initAnalytics(): void {
  if (!analyticsOn()) return
  const host = location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return
  window.goatcounter = { no_onload: false }
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://gc.zgo.at/count.js'
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`
  document.head.appendChild(s)
}

/** Count an anonymous event such as "fit-result". Does nothing when counting is off. */
export function trackEvent(name: string): void {
  if (!analyticsOn()) return
  try {
    window.goatcounter?.count?.({ path: name, title: name, event: true })
  } catch {
    // counting must never break the app
  }
}
