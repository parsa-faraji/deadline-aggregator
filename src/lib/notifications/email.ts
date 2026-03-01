import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendEmail(to: string, subject: string, body: string) {
  const client = getResend();
  if (!client) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }

  await client.emails.send({
    from: "Deadline Aggregator <deadlines@resend.dev>",
    to,
    subject,
    text: body,
  });
}
