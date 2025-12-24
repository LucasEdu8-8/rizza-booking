import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { vehiclesRoutes } from "./routes/vehicles.js";
import { availabilityRoutes } from "./routes/availability.js";
import { bookingsRoutes } from "./routes/bookings.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.CORS_ORIGIN });

app.get("/api/health", async () => ({ status: "ok" }));

await app.register(vehiclesRoutes);
await app.register(availabilityRoutes);
await app.register(bookingsRoutes);

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
