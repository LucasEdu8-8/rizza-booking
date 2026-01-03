import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { buildSlots } from "../utils/slots.js";

export async function availabilityRoutes(app: FastifyInstance) {
  app.get("/api/availability", async (req) => {
    const q = (req.query as any) ?? {};
    const dateStr = String(q.date ?? "");
    if (!dateStr) return { date: null, slots: [] };

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const allSlots = buildSlots();

    const now = new Date();
    const minutes = Number(process.env.CONFIRM_TOKEN_MINUTES ?? "30");
    const pendingValidAfter = new Date(now.getTime() - minutes * 60 * 1000);

    const booked = await prisma.booking.findMany({
      where: {
        date,
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", createdAt: { gte: pendingValidAfter } }
        ]
      },
      select: { time: true }
    });


    const bookedSet = new Set(booked.map(b => b.time));
    const slots = allSlots.map(t => ({ time: t, available: !bookedSet.has(t) }));

    return { date: dateStr, slots };
  });
}
