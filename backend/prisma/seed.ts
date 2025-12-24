import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const makes = [
    {
      name: "Aston Martin",
      models: [
        { name: "DBS", imageKey: "astonmartin_dbs" },
        { name: "Vantage", imageKey: "astonmartin_vantage" }
      ]
    },
    {
      name: "BMW",
      models: [
        { name: "Série 3", imageKey: "bmw_serie3" },
        { name: "Série 5", imageKey: "bmw_serie5" }
      ]
    },
    {
      name: "Mercedes-Benz",
      models: [
        { name: "Classe C", imageKey: "mercedes_classec" },
        { name: "Classe E", imageKey: "mercedes_classee" }
      ]
    }
  ];

  for (const mk of makes) {
    const make = await prisma.vehicleMake.upsert({
      where: { name: mk.name },
      update: {},
      create: { name: mk.name }
    });

    for (const md of mk.models) {
      await prisma.vehicleModel.upsert({
        where: { makeId_name: { makeId: make.id, name: md.name } },
        update: { imageKey: md.imageKey },
        create: { makeId: make.id, name: md.name, imageKey: md.imageKey }
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
