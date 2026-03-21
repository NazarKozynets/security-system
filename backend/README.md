# Security Management System Backend

Backend-only coursework project built with NestJS, TypeScript, PostgreSQL, Prisma, JWT, and Swagger.

## Features
- JWT authentication + RBAC permission checks
- User, role, and permission management
- Login attempt tracking
- Security event auditing
- Reporting endpoints with Prisma + raw SQL aggregations
- Swagger docs at `/docs`

## Environment variables
Copy `.env.example` to `.env`:

- `DATABASE_URL`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_TTL_DAYS`
- `LOCKOUT_MAX_FAILED_ATTEMPTS`
- `LOCKOUT_MINUTES`

## Install and run

```bash
npm install
npx prisma migrate dev --name init_security_system
npm run prisma:generate
npm run prisma:seed
npm run start:dev
```

## Demo credentials
- `admin@university.local` / `Admin12345!`
- `analyst@university.local` / `Analyst12345!`
- `user@university.local` / `User12345!`
