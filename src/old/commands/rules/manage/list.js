/* eslint-disable dot-notation */
const consola = require('consola');
const { EmbedBuilder } = require('discord.js');

const DiscordRule = require('../../../../modals/DiscordRule');
const { info, success } = require('../../../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info(
      'rules deploy list command',
      interaction.user.username,
      interaction.user.id
    );

    const rules = await DiscordRule.find({});

    const { name } = interaction.guild;

    const rulesList = rules.map((rule) => ({
      name: rule.id,
      value: rule.rule,
    }));

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${name} Rules`)
      .addFields(rulesList)
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
      });

    if (rulesList.length === 0) {
      embed.setDescription('No rules found.');
    }

    // with ephemeral: true, the message will only be visible to the user who triggered the command
    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    success(
      'rules deploy list command',
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    consola.error({
      message: `Errorr in running discord listing rules command: ${err}`,
      badge: true,
    });
  }
};
