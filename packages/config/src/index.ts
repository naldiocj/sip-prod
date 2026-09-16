export const config = {
  apiPort: Number(process.env.API_PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://sip:sip@localhost:5432/sip?schema=public",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379"
};
