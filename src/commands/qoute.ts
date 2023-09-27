import { SlashCommandBuilder } from "@discordjs/builders";
import { info, success, error } from "../utils/commandLogger";

import type { Client, CommandInteraction } from "discord.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("qoute")
  .setDescription("Get a random qoute");
