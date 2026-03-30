import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}

export const prismaPool = new Pool({
    connectionString,
});

export const prisma = new PrismaClient({
    adapter: new PrismaPg(prismaPool),
});