import { EmbedBuilder } from "discord.js";
import type { Client, CommandInteraction, Guild } from "discord.js";
import { info, success, error } from "../../utils/commandLogger";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
  try {
    info("owner guilds", interaction.user.username, interaction.user.id);

    if (!interaction.guildId) return;

    const guilds = client.guilds.cache.map((guild: Guild) => {
      return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
      };
    });

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("Guilds")
      .setDescription(
        `I am currently in ${client.guilds.cache.size} guilds. Here are some of them:`
      )
      .addFields(
        guilds.map((guild) => ({
          name: guild.name,
          value: `${guild.id} has ${guild.memberCount} members`,
          inline: true,
        }))
      )
      .setFooter({
        text: "Requested by " + interaction.user.username,
      });

    interaction.reply({
      embeds: [embed],
    });

    success("owner", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("owner", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
