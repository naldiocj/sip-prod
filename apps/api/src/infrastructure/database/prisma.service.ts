import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@sip/database";
import { config } from "@sip/config";

export class PrismaService extends PrismaClient {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }
}
