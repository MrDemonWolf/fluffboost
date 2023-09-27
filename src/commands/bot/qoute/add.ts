import { Client, CommandInteraction } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  qoute: string,
  author: string
) {
  try {
    info("bot qoute add", interaction.user.username, interaction.user.id);
    interaction.reply("This command is still being worked on");
    success("bot qoute add", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("bot qoute add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
