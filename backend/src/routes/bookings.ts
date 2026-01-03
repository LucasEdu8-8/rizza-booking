import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendBookingConfirmEmail } from "../services/email.js";
import { env } from "../env.js";
import crypto from "crypto";

const CURRENT_YEAR = new Date().getFullYear();

const CreateBookingSchema = z.object({
  serviceType: z.enum(["WASH_FULL", "REVIEW"]),
  makeId: z.number().int().positive(),
  modelId: z.number().int().positive(),
  vehicleYear: z.number().int().min(1950).max(CURRENT_YEAR + 1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export async function bookingsRoutes(app: FastifyInstance) {
  // cria booking como PENDING + envia email com link
  app.post("/api/bookings", async (req, reply) => {
    const body = CreateBookingSchema.parse(req.body);
    const date = new Date(`${body.date}T00:00:00.000Z`);

    const model = await prisma.vehicleModel.findFirst({
      where: { id: body.modelId, makeId: body.makeId },
      include: { make: true }
    });
    if (!model) {
      reply.code(400);
      return { error: "Veículo inválido." };
    }

    // Bloqueia slot enquanto PENDING não expira (evita dupla marcação)
    const now = new Date();
    const minutes = Number(process.env.CONFIRM_TOKEN_MINUTES ?? "30");
    const pendingValidAfter = new Date(now.getTime() - minutes * 60 * 1000);

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date < todayMidnight) {
      reply.code(400);
      return { error: "Data inválida (passado)." };
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
      return { error: "Slot indisponível." };
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

    const serviceLabel = body.serviceType === "WASH_FULL" ? "Lavagem Completa" : "Revisão";
    const vehicleLabel = `${model.make.name} ${model.name} ${body.vehicleYear ?? ""}`.trim();
    const dateLabel = body.date.split("-").reverse().join("-"); // DD-MM-YYYY

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm?token=${token}`;

    // Envio de email: se SMTP_HOST vazio, falha com erro explícito
    if (!env.SMTP_HOST) {
      reply.code(500);
      return { error: "SMTP não configurado (SMTP_HOST vazio)." };
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

}
