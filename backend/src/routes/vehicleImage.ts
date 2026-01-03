import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";

export async function vehicleImageRoutes(app: FastifyInstance) {
  app.get("/api/vehicle-image", async (req, reply) => {
    const q = req.query as any;

    const view = String(q.view ?? "front-left"); // front, front-left, front-right, left, right, rear...
    const modelId = q.modelId ? Number(q.modelId) : null;

    if (!env.VEHICLE_IMAGERY_API_KEY) {
      reply.code(500);
      return { error: "VEHICLE_IMAGERY_API_KEY não configurada." };
    }

    let viBrand: string | null = null;
    let viModel: string | null = null;
    let viYear: number | null = null;
    let viVariant: string | null = null;
    let viTrim: string | null = null;

    if (modelId) {
      const m = await prisma.vehicleModel.findUnique({
        where: { id: modelId },
        select: { viBrand: true, viModel: true, viYear: true, viVariant: true, viTrim: true },
      });
      viBrand = m?.viBrand ?? null;
      viModel = m?.viModel ?? null;
      viYear = m?.viYear ?? null;
      viVariant = m?.viVariant ?? null;
      viTrim = m?.viTrim ?? null;
    } else {
      viBrand = q.brand ?? null;
      viModel = q.model ?? null;
      viYear = q.year ? Number(q.year) : null;
      viVariant = q.variant ?? null;
      viTrim = q.trim ?? null;
    }

    if (!viBrand || !viModel || !viYear || !viVariant || !viTrim) {
      reply.code(400);
      return { error: "Mapping VehicleImagery incompleto para este modelo." };
    }

    const base = env.VEHICLE_IMAGERY_BASE_URL || "https://api.vehicleimagery.com/api";
    const url =
      `${base}/${encodeURIComponent(viBrand)}/${encodeURIComponent(viModel)}/${viYear}` +
      `/${encodeURIComponent(viVariant)}/${encodeURIComponent(viTrim)}/${encodeURIComponent(view)}`;

    const res = await fetch(url, {
      headers: { "x-api-key": env.VEHICLE_IMAGERY_API_KEY },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      reply.code(502);
      return { error: "Falha VehicleImagery", status: res.status, detail: txt.slice(0, 200) };
    }

    const buf = Buffer.from(await res.arrayBuffer());

    reply
      .header("Content-Type", "image/png")
      .header("Cache-Control", "public, max-age=86400");
    return reply.send(buf);
  });
}
