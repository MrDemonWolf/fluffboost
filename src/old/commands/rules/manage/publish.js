const consola = require('consola');
const dayjs = require('dayjs');

const { EmbedBuilder } = require('discord.js');

const DiscordGuild = require('../../../../modals/DiscordGuild');
const DiscordRule = require('../../../../modals/DiscordRule');
const { info, success } = require('../../../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info(
      'rules manage publish command',
      interaction.user.username,
      interaction.user.id
    );

    const { guild } = interaction;
    const { name } = guild;

    const discordGuild = await DiscordGuild.findOne({
      guildId: guild.id,
      'rules.channelId': { $exists: true },
    });

    if (!discordGuild) {
      await interaction.reply({
        content: 'No rules channel found. Please set one first.',
        ephemeral: true,
      });
      return;
    }

    if (discordGuild.rules.messageId) {
      await interaction.reply({
        content: 'Rules already published. Please unpublish first.',
        ephemeral: true,
      });
      return;
    }

    const rulesChannel = guild.channels.cache.get(discordGuild.rules.channelId);

    if (!rulesChannel) {
      await interaction.reply({
        content:
          'No rules channel found on the discord.  Please set a new one.',
        ephemeral: true,
      });
      return;
    }

    const rules = await DiscordRule.find({
      guildId: guild.id,
    });

    if (rules.length === 0) {
      await interaction.reply({
        content: 'No rules found. Please add some first.',
        ephemeral: true,
      });
      return;
    }

    const rulesList = rules.map((rule, index) => `${index + 1}. ${rule.rule}`);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${name} Rules`)
      .setDescription(rulesList.join('\n'))
      .setTimestamp()
      .setFooter({
        text: 'Last updated:',
      });

    const messageId = await rulesChannel.send({ embeds: [embed] });

    await DiscordGuild.findOneAndUpdate(
      {
        guildId: guild.id,
      },
      {
        $set: {
          'rules.messageId': messageId.id,
        },
      }
    );

    await interaction.reply({
      content: 'Rules published successfully.',
      ephemeral: true,
    });

    success(
      'rules manage publish command',
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    consola.error({
      message: `Error in running discord rules manage publish command: ${err}`,
      badge: true,
    });
  }
};
