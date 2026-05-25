import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Pawtrol 🐾 <noreply@pawtrolit.org>';

export async function sendEmail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message);
}
