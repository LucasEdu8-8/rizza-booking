import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendBookingEmail } from "../services/email.js";
import { env } from "../env.js";

const CreateBookingSchema = z.object({
  serviceType: z.enum(["WASH_FULL", "REVIEW"]),
  makeId: z.number().int().positive(),
  modelId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.string().email(),
  plate: z.string().optional(),
  notes: z.string().optional()
});

export async function bookingsRoutes(app: FastifyInstance) {
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

    const exists = await prisma.booking.findFirst({
      where: { date, time: body.time, status: "CONFIRMED" },
      select: { id: true }
    });

    if (exists) {
      reply.code(409);
      return { error: "Slot indisponível." };
    }

    const booking = await prisma.booking.create({
      data: {
        serviceType: body.serviceType,
        makeId: body.makeId,
        modelId: body.modelId,
        date,
        time: body.time,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        plate: body.plate || null,
        notes: body.notes || null
      }
    });

    if (env.SMTP_HOST) {
      const serviceLabel = body.serviceType === "WASH_FULL" ? "Lavagem Completa" : "Revisão";
      const vehicleLabel = `${model.make.name} ${model.name}`;
      const dateLabel = body.date.split("-").reverse().join("/");

      await sendBookingEmail({
        to: body.customerEmail,
        customerName: body.customerName,
        serviceLabel,
        vehicleLabel,
        dateLabel,
        time: body.time,
        notes: body.notes ?? null
      });
    }

    return { bookingId: booking.id };
  });
}
