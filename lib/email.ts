// Server-only. Never import in client components.
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'joona.orava@gmail.com'

// Strip CR/LF from strings used in email Subject headers to prevent header injection.
function sub(s: string): string {
  return s.replace(/[\r\n]/g, ' ')
}

// Escape user-supplied strings before interpolating into HTML to prevent XSS.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Sent when a new claim/create submission or onboarding submit arrives
export async function sendAdminNotificationEmail(params: {
  companyName: string
  venueName: string
  linkType: 'claim' | 'created'
  applicationId: number
  submittedAt: string
}) {
  const subject = `[Aktiivi] Uusi hakemus: ${sub(params.companyName)} — ${sub(params.venueName)}`
  const html = `
    <h2>Uusi ${params.linkType === 'claim' ? 'haltuunottopyyntö' : 'uusi paikka -hakemus'}</h2>
    <p><strong>Yritys:</strong> ${esc(params.companyName)}</p>
    <p><strong>Paikka:</strong> ${esc(params.venueName)}</p>
    <p><strong>Tyyppi:</strong> ${params.linkType === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}</p>
    <p><strong>Hakemus ID:</strong> ${params.applicationId}</p>
    <p><strong>Lähetetty:</strong> ${params.submittedAt}</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/${params.applicationId}">Tarkastele hakemusta →</a></p>
  `
  await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject, html })
}

// Sent to business when their application is approved
export async function sendApprovalEmail(to: string, params: {
  companyName: string
  venueName: string
}) {
  const subject = `[Aktiivi] Hakemuksesi on hyväksytty — ${sub(params.venueName)}`
  const html = `
    <h2>Hakemuksesi on hyväksytty!</h2>
    <p>Hei ${esc(params.companyName)},</p>
    <p>Paikkasi <strong>${esc(params.venueName)}</strong> on nyt julkaistu Aktiivi-hakemistossa.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/business">Siirry hallintapaneeliin →</a></p>
  `
  await resend.emails.send({ from: FROM, to, subject, html })
}

// Sent to business when their application is rejected
export async function sendRejectionEmail(to: string, params: {
  companyName: string
  venueName: string
  reason: string
}) {
  const subject = `[Aktiivi] Hakemuksesi on hylätty — ${sub(params.venueName)}`
  const html = `
    <h2>Hakemuksesi on hylätty</h2>
    <p>Hei ${esc(params.companyName)},</p>
    <p>Hakemuksesi paikalle <strong>${esc(params.venueName)}</strong> on hylätty.</p>
    <p><strong>Syy:</strong> ${esc(params.reason)}</p>
    <p>Voit hakea uudelleen korjaamalla hakemuksesi tiedot hallintapaneelista.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/business">Siirry hallintapaneeliin →</a></p>
  `
  await resend.emails.send({ from: FROM, to, subject, html })
}
