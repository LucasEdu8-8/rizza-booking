# RIZZA Booking (Full Project)

Stack:
- PostgreSQL (Docker)
- Backend: Node.js + Fastify + Prisma + Nodemailer
- Frontend: Angular (standalone)

## Run database
```bash
docker compose up -d
```

## Backend
```bash
cd backend
cp ../.env.example .env
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Health: http://localhost:3000/api/health

## Frontend
```bash
cd ../frontend
npm i
npm start
```

Frontend: http://localhost:4200

## Notes
- Email is sent only if SMTP_HOST is set in backend/.env
- Vehicle images are loaded from: frontend/src/assets/cars/{imageKey}.png
