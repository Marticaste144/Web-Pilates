import { Resend } from "resend";

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY en .env.local");
  }

  return new Resend(apiKey);
}

export function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("Falta EMAIL_FROM en .env.local");
  }

  return from;
}
