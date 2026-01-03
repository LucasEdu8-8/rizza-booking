import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? "3000"),
  DATABASE_URL: req("DATABASE_URL"),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",

  VEHICLE_IMAGERY_API_KEY: process.env.VEHICLE_IMAGERY_API_KEY ?? "",
  VEHICLE_IMAGERY_BASE_URL: process.env.VEHICLE_IMAGERY_BASE_URL ?? "",

  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? "587"),
  SMTP_SECURE: (process.env.SMTP_SECURE ?? "false") === "true",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  MAIL_FROM: process.env.MAIL_FROM ?? "RIZZA <no-reply@example.com>",
  MAIL_BCC_INTERNAL: process.env.MAIL_BCC_INTERNAL ?? "",

  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? "",   // ex: https://api.rizzagroup.com
  FRONTEND_URL: process.env.FRONTEND_URL ?? "",         // ex: https://booking.rizzagroup.com
  CONFIRM_TOKEN_MINUTES: Number(process.env.CONFIRM_TOKEN_MINUTES ?? "30"),
  NODE_ENV: process.env.NODE_ENV ?? "development",

};
