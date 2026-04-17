import { MessageFlags } from "discord.js";
import type { CommandInteraction } from "discord.js";

interface ReplyWithTextFileOptions<T> {
  interaction: CommandInteraction;
  rows: T[];
  header: string;
  formatRow: (row: T) => string;
  filename: string;
  emptyMessage: string;
  ephemeral?: boolean;
}

/**
 * Reply to a slash command with either an empty-state message or
 * the rows formatted as a plain-text file attachment.
 */
export async function replyWithTextFile<T>({
  interaction,
  rows,
  header,
  formatRow,
  filename,
  emptyMessage,
  ephemeral = true,
}: ReplyWithTextFileOptions<T>): Promise<void> {
  if (rows.length === 0) {
    await interaction.reply({
      content: emptyMessage,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const body = rows.map(formatRow).join("\n");
  const text = `${header}\n${body}\n`;

  await interaction.reply({
    files: [{ attachment: Buffer.from(text), name: filename }],
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
  });
}
