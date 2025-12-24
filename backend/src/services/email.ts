import nodemailer from "nodemailer";
import { env } from "../env.js";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

export async function sendBookingEmail(input: {
  to: string;
  customerName: string;
  serviceLabel: string;
  vehicleLabel: string;
  dateLabel: string;
  time: string;
  notes?: string | null;
}) {
  const subject = "Confirmação de Marcação — RIZZA";
  const text = `Olá ${input.customerName},

A tua marcação foi confirmada.

Serviço: ${input.serviceLabel}
Veículo: ${input.vehicleLabel}
Data: ${input.dateLabel}
Hora: ${input.time}${input.notes ? `

Observações: ${input.notes}` : ""}

Se precisares de alterar, responde a este email.

RIZZA`;

  await mailer.sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    bcc: env.MAIL_BCC_INTERNAL || undefined,
    subject,
    text
  });
}
