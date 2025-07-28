import { PrismaClient } from "@prisma/client";
import env from "../utils/env";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "production" ? [] : ["query"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
