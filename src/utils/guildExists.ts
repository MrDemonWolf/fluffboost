import { prisma } from "../database";

export async function guildExists(guildId: string) {
  const guildExists = await prisma.guild.findUnique({
    where: {
      guildId,
    },
  });

  if (!guildExists) {
    await prisma.guild.create({
      data: {
        guildId,
      },
    });
    return false;
  }
  return true;
}
