import nodemailer from "nodemailer";
import { env } from "../env.js";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export async function verifyMailer() {
  if (!env.SMTP_HOST) return;
  await mailer.verify();
}

export async function sendBookingConfirmEmail(input: {
  to: string;
  customerName: string;
  serviceLabel: string;
  vehicleLabel: string;
  dateLabel: string; // DD-MM-YYYY
  time: string;
  notes?: string | null;
  confirmUrl: string;
}) {
  const subject = `Confirmação de Marcação — RIZZA`;

  const safeNotes = (input.notes ?? "").trim();
  const notesBlock = safeNotes
    ? `
      <tr>
        <td style="padding:10px 0 0; color:#AEB4BA; font-size:14px; line-height:20px;">
          <div style="font-weight:700; color:#D7DBE0; margin-bottom:6px;">Observações</div>
          <div style="background:#0B0C0E; border:1px solid #2A2E33; border-radius:12px; padding:12px; color:#C9CDD2;">
            ${escapeHtml(safeNotes)}
          </div>
        </td>
      </tr>
    `
    : "";

  const html = `<!doctype html>
  <html lang="pt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(subject)}</title>

    <style>
      /* Base resets */
      html, body { margin:0 !important; padding:0 !important; width:100% !important; height:100% !important; }
      * { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
      table, td { border-collapse:collapse !important; mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; }
      img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
      a { text-decoration:none; }

      /* Responsive */
      @media screen and (max-width: 600px) {
        .container { width:100% !important; max-width:100% !important; }
        .px { padding-left:16px !important; padding-right:16px !important; }
        .pt { padding-top:16px !important; }
        .pb { padding-bottom:16px !important; }
        .h1 { font-size:20px !important; }
        .sub { font-size:14px !important; }
        .btn { width:100% !important; max-width:100% !important; }
        .card { border-radius:14px !important; }
        .summary td { font-size:14px !important; }
      }

      /* Dark/Light hints (nem todos os clientes respeitam, mas ajuda) */
      @media (prefers-color-scheme: dark) {
        .bg { background:#050607 !important; }
        .card { background:#101216 !important; border-color:#2B2F35 !important; }
        .muted { color:#AEB4BA !important; }
        .text { color:#E9EDF2 !important; }
        .box { background:#0A0B0D !important; border-color:#24282E !important; }
        .rule { background:#24282E !important; }
      }
      @media (prefers-color-scheme: light) {
        .bg { background:#F3F5F7 !important; }
        .card { background:#FFFFFF !important; border-color:#D7DCE2 !important; }
        .muted { color:#5C6672 !important; }
        .text { color:#0B0C0E !important; }
        .box { background:#F7F9FB !important; border-color:#D7DCE2 !important; }
        .rule { background:#E3E7EC !important; }
      }
    </style>
  </head>

  <body class="bg" style="background:#050607; margin:0; padding:0;">
    <!-- Preheader -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      Confirma a tua marcação na RIZZA em 1 clique.
    </div>

    <!-- Full width wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#050607" style="background:#050607;" class="bg">
      <tr>
        <td align="center" class="px pt pb" style="padding:22px 12px;">

          <!-- Container (fluid) -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width:600px; width:100%;">
            <tr>
              <td align="center" style="padding:0 0 10px;">
                <div style="letter-spacing:.28em; font-size:12px; color:#9AA2AA;" class="muted">R I Z Z A</div>
              </td>
            </tr>

            <tr>
              <td class="card" style="
                border:1px solid #2B2F35;
                border-radius:18px;
                overflow:hidden;
                background:#101216;
                box-shadow:0 18px 50px rgba(0,0,0,.40);
              ">

                <!-- Chrome strip -->
                <div style="height:6px; background:linear-gradient(90deg,#C9CED6 0%,#7E8793 35%,#E8EDF5 60%,#7A838E 85%,#C9CED6 100%);"></div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" class="px" style="padding:18px 20px 10px;">
                      <div class="h1 text" style="font-size:22px; font-weight:800; letter-spacing:.04em; color:#E9EDF2;">
                        Confirmação de Marcação
                      </div>
                      <div class="sub muted" style="margin-top:8px; font-size:14px; line-height:20px; color:#AEB4BA;">
                        Olá <b class="text" style="color:#E9EDF2;">${escapeHtml(input.customerName)}</b>, recebemos o teu pedido.<br>
                        Clica para confirmar.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td class="px" style="padding:10px 20px 0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="box" style="
                        background:#0A0B0D;
                        border:1px solid #24282E;
                        border-radius:14px;
                      ">
                        <tr>
                          <td style="padding:14px;">
                            <div class="muted" style="font-size:12px; letter-spacing:.18em; color:#9AA2AA;">RESUMO</div>
                            <div style="height:10px"></div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="summary">
                              <tr>
                                <td class="muted" style="padding:6px 0; color:#AEB4BA; font-size:13px;">Serviço</td>
                                <td align="right" class="text" style="padding:6px 0; color:#E9EDF2; font-weight:700; font-size:13px;">
                                  ${escapeHtml(input.serviceLabel)}
                                </td>
                              </tr>
                              <tr>
                                <td class="muted" style="padding:6px 0; color:#AEB4BA; font-size:13px;">Veículo</td>
                                <td align="right" class="text" style="padding:6px 0; color:#E9EDF2; font-weight:700; font-size:13px;">
                                  ${escapeHtml(input.vehicleLabel)}
                                </td>
                              </tr>
                              <tr>
                                <td class="muted" style="padding:6px 0; color:#AEB4BA; font-size:13px;">Data</td>
                                <td align="right" class="text" style="padding:6px 0; color:#E9EDF2; font-weight:700; font-size:13px;">
                                  ${escapeHtml(input.dateLabel)}
                                </td>
                              </tr>
                              <tr>
                                <td class="muted" style="padding:6px 0; color:#AEB4BA; font-size:13px;">Hora</td>
                                <td align="right" class="text" style="padding:6px 0; color:#E9EDF2; font-weight:700; font-size:13px;">
                                  ${escapeHtml(input.time)}
                                </td>
                              </tr>
                            </table>

                            ${((input.notes ?? "").trim())
                              ? `
                                <div style="height:12px"></div>
                                <div class="muted" style="font-size:12px; font-weight:700; color:#9AA2AA; margin-bottom:6px;">Observações</div>
                                <div class="text" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; color:#E9EDF2; line-height:18px;">
                                  ${escapeHtml((input.notes ?? "").trim())}
                                </div>
                              `
                              : ``}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" class="px" style="padding:16px 20px 8px;">
                      <!-- CTA button (table-based for iOS Gmail) -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0; padding:0;">
                        <tr>
                          <td align="center" class="px" style="padding:16px 20px 8px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
                              <tr>
                                <td align="center" bgcolor="#0B0C0E" style="
                                  background:#0B0C0E;
                                  border:1px solid #2B2F35;
                                  border-radius:12px;
                                  padding:0;
                                ">
                                  <a href="${escapeAttr(input.confirmUrl)}" target="_blank" style="
                                    display:block;
                                    width:100%;
                                    padding:14px 16px;
                                    font-weight:900;
                                    letter-spacing:.06em;
                                    color:#E9EDF2;
                                    text-decoration:none;
                                    border-radius:12px;
                                  ">
                                    CONFIRMAR MARCAÇÃO
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <tr>
                    <td class="px muted" style="padding:8px 20px 16px; color:#AEB4BA; font-size:12px; line-height:18px;">
                      Se o botão não abrir, usa este link:<br>
                      <a href="${escapeAttr(input.confirmUrl)}" target="_blank" style="color:#C9CED6; word-break:break-all;">
                        ${escapeHtml(input.confirmUrl)}
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td class="px" style="padding:0 20px 16px;">
                      <div class="rule" style="height:1px; background:#24282E;"></div>
                      <div class="muted" style="padding-top:12px; color:#7E8793; font-size:12px; line-height:18px; text-align:center;">
                        Se não foste tu que fizeste este pedido, ignora este email.<br>
                        © RIZZA
                      </div>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <tr>
              <td align="center" style="padding:12px 0 0; color:#6F7883; font-size:11px; letter-spacing:.06em;" class="muted">
                RIZZA • Marcações
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const text =
`Olá ${input.customerName},

Recebemos o teu pedido de marcação. Para CONFIRMAR, abre este link:
${input.confirmUrl}

Resumo:
Serviço: ${input.serviceLabel}
Veículo: ${input.vehicleLabel}
Data: ${input.dateLabel}
Hora: ${input.time}
${safeNotes ? `Observações: ${safeNotes}` : ""}

Se não foste tu, ignora este email.

RIZZA`;

  await mailer.sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    bcc: env.MAIL_BCC_INTERNAL || undefined,
    subject,
    text,
    html
  });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s: string) {
  // para href
  return escapeHtml(s).replaceAll("`", "&#096;");
}