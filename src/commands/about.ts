import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Client, CommandInteraction, User } from "discord.js";
import { info, success, error } from "../utils/commandLogger";

export const slashCommand = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Learn more about the bot and its creator");

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("about", interaction.user.username, interaction.user.id);

    const { username } = client.user as User;

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle(`About ${username} 🐾`)
      .setDescription(
        `Hi! I'm ${username}, a discord bot created by MrDemonWolf, Inc. I was created to help you with your daily tasks and to make your life easier. I'm currently in ${client.guilds.cache.size} guilds.`
      )
      .addFields(
        {
          name: "Creators Website",
          value: "[Website](https://www.mrdmeonwolf.com)",
          inline: true,
        },
        {
          name: "Creators Discord",
          value: "[Discord](https://l.mrdemonwolf.com/discord)",
          inline: true,
        },
        {
          name: "Version",
          value: "1.0.0",
        }
      )
      .setFooter({
        text: "Made with ❤️ by MrDemonWolf, Inc.",
      });
    interaction.reply({
      embeds: [embed],
    });
    success("about", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("about", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
