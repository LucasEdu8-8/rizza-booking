import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

type Make = { id: number; name: string };
type Model = { id: number; name: string; imageKey: string; makeId: number };

const CACHE_TTL_MS = 60 * 60 * 1000;

let makesCache: { expiresAt: number; data: Make[] } | null = null;
const modelsCache = new Map<number, { expiresAt: number; data: Model[] }>();

function setCache(reply: any, ttlMs: number) {
  const seconds = Math.max(0, Math.floor(ttlMs / 1000));
  reply.header("Cache-Control", `public, max-age=${seconds}`);
}

function isValidMakeId(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export async function vehiclesRoutes(app: FastifyInstance) {
  app.get("/api/vehicles/makes", async (_req, reply) => {
    const now = Date.now();
    if (makesCache && makesCache.expiresAt > now) {
      setCache(reply, CACHE_TTL_MS);
      return { makes: makesCache.data };
    }

    const makes = await prisma.vehicleMake.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    });

    makesCache = { expiresAt: now + CACHE_TTL_MS, data: makes };
    setCache(reply, CACHE_TTL_MS);
    return { makes };
  });

  app.get("/api/vehicles/models", async (req, reply) => {
    const q = (req.query as any) ?? {};
    const makeId = Number(q.makeId);
    if (!isValidMakeId(makeId)) return { models: [] };

    const now = Date.now();
    const cached = modelsCache.get(makeId);
    if (cached && cached.expiresAt > now) {
      setCache(reply, CACHE_TTL_MS);
      return { models: cached.data };
    }

    const models = await prisma.vehicleModel.findMany({
      where: { makeId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, imageKey: true, makeId: true }
    });

    modelsCache.set(makeId, { expiresAt: now + CACHE_TTL_MS, data: models });
    setCache(reply, CACHE_TTL_MS);
    return { models };
  });
}
