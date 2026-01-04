import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendBookingConfirmEmail } from "../services/email.js";
import { env } from "../env.js";
import { parseDateInput } from "../utils/date.js";
import crypto from "crypto";

const CURRENT_YEAR = new Date().getFullYear();

const CreateBookingSchema = z.object({
  serviceType: z.enum(["WASH_FULL", "REVIEW"]),
  makeId: z.number().int().positive(),
  modelId: z.number().int().positive(),
  vehicleYear: z.number().int().min(1950).max(CURRENT_YEAR + 1).optional(),
  date: z.string().refine((v) => parseDateInput(v) !== null, "Data invalida."),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.string().email(),
  plate: z.string().optional(),
  notes: z.string().optional()
});

const ConfirmSchema = z.object({
  token: z.string().min(10)
});

function formatDatePt(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

function htmlEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureBasicAuth(req: any, reply: any): boolean {
  if (!env.ADMIN_USER || !env.ADMIN_PASS) return true;

  const auth = String(req.headers?.authorization ?? "");
  if (!auth.startsWith("Basic ")) {
    reply.code(401).header("WWW-Authenticate", "Basic");
    return false;
  }

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  if (user === env.ADMIN_USER && pass === env.ADMIN_PASS) return true;

  reply.code(401).header("WWW-Authenticate", "Basic");
  return false;
}

export async function bookingsRoutes(app: FastifyInstance) {
  // cria booking como PENDING + envia email com link
  app.post("/api/bookings", async (req, reply) => {
    const body = CreateBookingSchema.parse(req.body);
    const date = parseDateInput(body.date);
    if (!date) {
      reply.code(400);
      return { error: "Data invalida." };
    }

    const model = await prisma.vehicleModel.findFirst({
      where: { id: body.modelId, makeId: body.makeId },
      include: { make: true }
    });
    if (!model) {
      reply.code(400);
      return { error: "Veiculo invalido." };
    }

    // Bloqueia slot enquanto PENDING nao expira (evita dupla marcacao)
    const now = new Date();
    const minutes = Number(process.env.CONFIRM_TOKEN_MINUTES ?? "30");
    const pendingValidAfter = new Date(now.getTime() - minutes * 60 * 1000);

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date < todayMidnight) {
      reply.code(400);
      return { error: "Data invalida (passado)." };
    }

    const exists = await prisma.booking.findFirst({
      where: {
        date,
        time: body.time,
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", createdAt: { gte: pendingValidAfter } }
        ]
      },
      select: { id: true }
    });

    if (exists) {
      reply.code(409);
      return { error: "Slot indisponivel." };
    }

    const token = crypto.randomBytes(24).toString("hex");
    const tokenExpires = new Date(now.getTime() + minutes * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        serviceType: body.serviceType,
        makeId: body.makeId,
        modelId: body.modelId,
        vehicleYear: body.vehicleYear ?? null,
        date,
        time: body.time,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        plate: body.plate || null,
        notes: body.notes || null,
        status: "PENDING",
        confirmToken: token,
        tokenExpires
      }
    });

    const serviceLabel = body.serviceType === "WASH_FULL" ? "Lavagem Completa" : "Revisao";
    const vehicleLabel = `${model.make.name} ${model.name} ${body.vehicleYear ?? ""}`.trim();
    const dateLabel = formatDatePt(date);

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm?token=${token}`;

    // Envio de email: se SMTP_HOST vazio, falha com erro explicito
    if (!env.SMTP_HOST) {
      reply.code(500);
      return { error: "SMTP nao configurado (SMTP_HOST vazio)." };
    }

    await sendBookingConfirmEmail({
      to: body.customerEmail,
      customerName: body.customerName,
      serviceLabel,
      vehicleLabel,
      dateLabel,
      time: body.time,
      notes: body.notes,
      confirmUrl
    });

    return { bookingId: booking.id, status: "PENDING" };
  });

  app.post("/api/bookings/confirm", async (req, reply) => {
    const body = ConfirmSchema.parse(req.body); // { token }
    const now = new Date();

    const booking = await prisma.booking.findFirst({
      where: { confirmToken: body.token },
      select: { id: true, tokenExpires: true, status: true }
    });

    if (!booking) {
      reply.code(400);
      return { ok: false, reason: "INVALID_TOKEN" };
    }

    if (!booking.tokenExpires || booking.tokenExpires < now) {
      reply.code(400);
      return { ok: false, reason: "TOKEN_EXPIRED" };
    }

    if (booking.status !== "CONFIRMED") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: now,
          confirmToken: null,
          tokenExpires: null
        }
      });
    }

    return { ok: true, status: "CONFIRMED" };
  });

  app.get("/api/bookings/export.csv", async (req, reply) => {
    if (!ensureBasicAuth(req, reply)) return;

    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        make: { select: { name: true } },
        model: { select: { name: true } }
      }
    });

    const header = [
      "id",
      "status",
      "serviceType",
      "make",
      "model",
      "vehicleYear",
      "date",
      "time",
      "customerName",
      "customerPhone",
      "customerEmail",
      "plate",
      "notes",
      "createdAt"
    ];

    const lines = [header.join(",")];
    for (const b of bookings) {
      const row = [
        b.id,
        b.status,
        b.serviceType,
        b.make?.name ?? "",
        b.model?.name ?? "",
        b.vehicleYear ?? "",
        formatDatePt(b.date),
        b.time,
        b.customerName,
        b.customerPhone,
        b.customerEmail,
        b.plate ?? "",
        b.notes ?? "",
        b.createdAt.toISOString()
      ].map(csvEscape);

      lines.push(row.join(","));
    }

    const csv = lines.join("\n");
    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", "attachment; filename=\"bookings.csv\"")
      .send(csv);
  });

  app.get("/admin/bookings", async (req, reply) => {
    if (!ensureBasicAuth(req, reply)) return;

    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        make: { select: { name: true } },
        model: { select: { name: true } }
      }
    });

    const rows = bookings.map((b) => {
      const dateIso = b.date.toISOString().slice(0, 10);
      const searchText = [
        b.status,
        b.serviceType,
        b.make?.name ?? "",
        b.model?.name ?? "",
        b.vehicleYear ?? "",
        formatDatePt(b.date),
        b.time,
        b.customerName,
        b.customerPhone,
        b.customerEmail,
        b.plate ?? "",
        b.notes ?? ""
      ].join(" ");

      return `
        <tr data-row="1"
            data-status="${htmlEscape(b.status)}"
            data-service="${htmlEscape(b.serviceType)}"
            data-date="${htmlEscape(dateIso)}"
            data-search="${htmlEscape(searchText)}">
          <td>${htmlEscape(b.status)}</td>
          <td>${htmlEscape(b.serviceType)}</td>
          <td>${htmlEscape(b.make?.name ?? "")}</td>
          <td>${htmlEscape(b.model?.name ?? "")}</td>
          <td>${htmlEscape(b.vehicleYear ?? "")}</td>
          <td>${htmlEscape(formatDatePt(b.date))}</td>
          <td>${htmlEscape(b.time)}</td>
          <td>${htmlEscape(b.customerName)}</td>
          <td>${htmlEscape(b.customerPhone)}</td>
          <td>${htmlEscape(b.customerEmail)}</td>
          <td>${htmlEscape(b.plate ?? "")}</td>
          <td>${htmlEscape(b.notes ?? "")}</td>
          <td>${htmlEscape(b.createdAt.toISOString())}</td>
        </tr>`;
    }).join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Rizza Bookings</title>
    <style>
      body { font-family: Arial, sans-serif; background:#0b0b0b; color:#f1f1f1; margin:0; }
      header { padding: 16px 20px; border-bottom: 1px solid #1c1c1c; display:flex; align-items:center; justify-content:space-between; gap: 12px; flex-wrap: wrap; }
      h1 { font-size: 16px; letter-spacing: .08em; text-transform: uppercase; margin:0; color:#b9b9b9; }
      a { color:#f1f1f1; text-decoration:none; border:1px solid #6a7077; padding:8px 10px; border-radius:10px; }
      .wrap { padding: 16px 20px; }
      .filters { display:flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 16px; }
      .filters input, .filters select { background:#0a0a0a; color:#f1f1f1; border:1px solid #1c1c1c; border-radius:10px; padding:8px 10px; font-size: 12px; }
      .filters label { font-size: 12px; color:#b9b9b9; display:flex; align-items:center; gap:8px; }
      .meta { display:flex; align-items:center; gap: 12px; font-size: 12px; color:#b9b9b9; margin-bottom: 8px; flex-wrap: wrap; }
      .pager { display:flex; align-items:center; gap: 8px; margin-left: auto; }
      .pager button { background:transparent; color:#f1f1f1; border:1px solid #6a7077; padding:6px 10px; border-radius:10px; cursor:pointer; }
      .pager button:disabled { opacity: .4; cursor: not-allowed; }
      table { width:100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #1c1c1c; padding: 8px 6px; text-align: left; vertical-align: top; }
      th { color:#b9b9b9; font-weight: 600; position: sticky; top: 0; background:#0b0b0b; }
      tr:hover td { background: rgba(255,255,255,0.03); }
    </style>
  </head>
  <body>
    <header>
      <h1>Marcacoes</h1>
      <a href="/api/bookings/export.csv">Exportar CSV</a>
    </header>
    <div class="wrap">
      <div class="filters">
        <input id="searchInput" type="search" placeholder="Pesquisar..." />
        <select id="statusFilter">
          <option value="">Status (todos)</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select id="serviceFilter">
          <option value="">Servico (todos)</option>
          <option value="WASH_FULL">WASH_FULL</option>
          <option value="REVIEW">REVIEW</option>
        </select>
        <label>De <input id="dateFrom" type="date" /></label>
        <label>Ate <input id="dateTo" type="date" /></label>
        <select id="pageSize">
          <option value="10">10 por pagina</option>
          <option value="25" selected>25 por pagina</option>
          <option value="50">50 por pagina</option>
        </select>
      </div>

      <div class="meta">
        <span id="totalInfo"></span>
        <div class="pager">
          <button id="prevPage" type="button">Anterior</button>
          <span id="pageInfo"></span>
          <button id="nextPage" type="button">Proxima</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Servico</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Ano</th>
            <th>Data</th>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Telefone</th>
            <th>Email</th>
            <th>Matricula</th>
            <th>Notas</th>
            <th>Criado</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr id="emptyRow" style="display:none;">
            <td colspan="13">Sem marcacoes.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <script>
      const rows = Array.from(document.querySelectorAll("tbody tr[data-row]"));
      const emptyRow = document.getElementById("emptyRow");
      const searchInput = document.getElementById("searchInput");
      const statusFilter = document.getElementById("statusFilter");
      const serviceFilter = document.getElementById("serviceFilter");
      const dateFrom = document.getElementById("dateFrom");
      const dateTo = document.getElementById("dateTo");
      const pageSize = document.getElementById("pageSize");
      const prevPage = document.getElementById("prevPage");
      const nextPage = document.getElementById("nextPage");
      const pageInfo = document.getElementById("pageInfo");
      const totalInfo = document.getElementById("totalInfo");

      let page = 1;

      function normalize(value) {
        return (value || "")
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }

      function applyFilters() {
        const query = normalize(searchInput.value);
        const status = statusFilter.value;
        const service = serviceFilter.value;
        const from = dateFrom.value;
        const to = dateTo.value;
        const size = Number(pageSize.value || "25");

        const filtered = rows.filter((row) => {
          if (status && row.dataset.status !== status) return false;
          if (service && row.dataset.service !== service) return false;
          const d = row.dataset.date || "";
          if (from && d < from) return false;
          if (to && d > to) return false;
          if (query) {
            const hay = normalize(row.dataset.search || "");
            if (!hay.includes(query)) return false;
          }
          return true;
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / size));
        if (page > totalPages) page = totalPages;
        if (page < 1) page = 1;

        rows.forEach((row) => { row.style.display = "none"; });
        const start = (page - 1) * size;
        const end = start + size;
        filtered.forEach((row, index) => {
          if (index >= start && index < end) row.style.display = "";
        });

        emptyRow.style.display = total ? "none" : "";
        pageInfo.textContent = page + " / " + totalPages;
        totalInfo.textContent = total + " marcacoes";
        prevPage.disabled = page <= 1;
        nextPage.disabled = page >= totalPages;
      }

      function onFilterChange() {
        page = 1;
        applyFilters();
      }

      searchInput.addEventListener("input", onFilterChange);
      statusFilter.addEventListener("change", onFilterChange);
      serviceFilter.addEventListener("change", onFilterChange);
      dateFrom.addEventListener("change", onFilterChange);
      dateTo.addEventListener("change", onFilterChange);
      pageSize.addEventListener("change", onFilterChange);

      prevPage.addEventListener("click", () => {
        page -= 1;
        applyFilters();
      });

      nextPage.addEventListener("click", () => {
        page += 1;
        applyFilters();
      });

      applyFilters();
    </script>
  </body>
</html>`;

    reply
      .header("Content-Type", "text/html; charset=utf-8")
      .send(html);
  });
}
