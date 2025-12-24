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

  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? "587"),
  SMTP_SECURE: (process.env.SMTP_SECURE ?? "false") === "true",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  MAIL_FROM: process.env.MAIL_FROM ?? "RIZZA <no-reply@example.com>",
  MAIL_BCC_INTERNAL: process.env.MAIL_BCC_INTERNAL ?? ""
};
