const consola = require('consola');
const dayjs = require('dayjs');

const DiscordRule = require('../../../../modals/DiscordRule');
const DiscordGuild = require('../../../../modals/DiscordGuild');
const { info, success } = require('../../../../utils/discord/commands/log');
const rulesUpdater = require('../../../../utils/discord/commands/rulesUpdater');

module.exports = async (client, interaction) => {
  try {
    info(
      'rules deploy create command',
      interaction.user.username,
      interaction.user.id
    );

    const { guild } = interaction;

    const discordGuild = await DiscordGuild.findOne({
      guildId: guild.id,
    });

    if (!discordGuild) {
      consola.error({
        message: `No guild found for ${guild.name}`,
        badge: true,
      });
      return;
    }

    const rule = interaction.options.getString('rule');

    const newRule = new DiscordRule({
      rule,
    });

    await newRule.save();

    /**
     * Update the last updated rules date
     */
    discordGuild.rules.updatedAt = dayjs();

    await discordGuild.save();

    await interaction.reply({
      content: `New rule created: ${rule}`,
      ephemeral: true,
    });

    success(
      `rules deploy create command. Rule: ${newRule.id}.`,
      interaction.user.username,
      interaction.user.id
    );

    // update the rules message if it's already published
    if (discordGuild.rules.channelId && discordGuild.rules.messageId) {
      await rulesUpdater(guild);
    }
  } catch (err) {
    consola.error({
      message: `Errorr in running discord creating rule command: ${err}`,
      badge: true,
    });
  }
};
