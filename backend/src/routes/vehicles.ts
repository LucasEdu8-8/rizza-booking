import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function vehiclesRoutes(app: FastifyInstance) {
  app.get("/api/vehicles/makes", async () => {
    const makes = await prisma.vehicleMake.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    });
    return { makes };
  });

  app.get("/api/vehicles/models", async (req) => {
    const q = (req.query as any) ?? {};
    const makeId = Number(q.makeId);
    if (!makeId) return { models: [] };

    const models = await prisma.vehicleModel.findMany({
      where: { makeId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, imageKey: true, makeId: true }
    });

    return { models };
  });
}
