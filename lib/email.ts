// Server-only. Never import in client components.
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'joona.orava@gmail.com'

// Sent when a new claim/create submission or onboarding submit arrives
export async function sendAdminNotificationEmail(params: {
  companyName: string
  venueName: string
  linkType: 'claim' | 'created'
  applicationId: number
  submittedAt: string
}) {
  const subject = `[Aktiivi] Uusi hakemus: ${params.companyName} — ${params.venueName}`
  const html = `
    <h2>Uusi ${params.linkType === 'claim' ? 'haltuunottopyyntö' : 'uusi paikka -hakemus'}</h2>
    <p><strong>Yritys:</strong> ${params.companyName}</p>
    <p><strong>Paikka:</strong> ${params.venueName}</p>
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
  const subject = `[Aktiivi] Hakemuksesi on hyväksytty — ${params.venueName}`
  const html = `
    <h2>Hakemuksesi on hyväksytty!</h2>
    <p>Hei ${params.companyName},</p>
    <p>Paikkasi <strong>${params.venueName}</strong> on nyt julkaistu Aktiivi-hakemistossa.</p>
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
  const subject = `[Aktiivi] Hakemuksesi on hylätty — ${params.venueName}`
  const html = `
    <h2>Hakemuksesi on hylätty</h2>
    <p>Hei ${params.companyName},</p>
    <p>Hakemuksesi paikalle <strong>${params.venueName}</strong> on hylätty.</p>
    <p><strong>Syy:</strong> ${params.reason}</p>
    <p>Voit hakea uudelleen korjaamalla hakemuksesi tiedot hallintapaneelista.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/business">Siirry hallintapaneeliin →</a></p>
  `
  await resend.emails.send({ from: FROM, to, subject, html })
}
