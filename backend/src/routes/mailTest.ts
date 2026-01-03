import { FastifyInstance } from "fastify";
import { mailer } from "../services/email.js";
import { env } from "../env.js";

export async function mailTestRoutes(app: FastifyInstance) {
  app.post("/api/mail/test", async (req) => {
    const body = (req.body as any) ?? {};
    const to = body.to as string;

    await mailer.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: "Teste SMTP RIZZA",
      text: "SMTP ok."
    });

    return { ok: true };
  });
}
