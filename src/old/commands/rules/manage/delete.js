const consola = require('consola');
const dayjs = require('dayjs');

const DiscordRule = require('../../../../modals/DiscordRule');
const DiscordGuild = require('../../../../modals/DiscordGuild');
const { info, success } = require('../../../../utils/discord/commands/log');
const rulesUpdater = require('../../../../utils/discord/commands/rulesUpdater');

module.exports = async (client, interaction) => {
  try {
    info(
      'rules deploy delete command',
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

    let ruleData = {};

    /**
     * Get discord interaction options
     */
    const ruleId = interaction.options.getString('ruleid');

    /**
     * Get the rule from the database
     * checks if the rule exists
     * if it does, delete it
     */
    try {
      ruleData = await DiscordRule.findById(ruleId);

      if (!ruleData) {
        consola.error({
          message: `* Rule ${ruleId} does not exist. ${interaction.user.username} (${interaction.user.id})`,
          badge: true,
        });
        return interaction.reply({
          content: `Rule \`${ruleId}\` does not exist.`,
          ephemeral: true,
        });
      }
    } catch (err) {
      consola.error({
        message: `* Error finding rule ${ruleId}: ${err}. ${interaction.user.username} (${interaction.user.id})`,
        badge: true,
      });
      return interaction.reply({
        content: `Rule \`${ruleId}\` does not exist.`,
        ephemeral: true,
      });
    }

    await ruleData.delete();

    /**
     * Update the last updated rules date
     */
    discordGuild.rules.updatedAt = dayjs();

    await discordGuild.save();

    await interaction.reply({
      content: `Rule has been deleted: ${ruleData.rule}`,
      ephemeral: true,
    });

    success(
      `rules deploy delete command. Deleted Rule: ${ruleData.id}.`,
      interaction.user.username,
      interaction.user.id
    );

    // update the rules message if it's already published
    if (discordGuild.rules.channelId && discordGuild.rules.messageId) {
      await rulesUpdater(guild);
    }
  } catch (err) {
    consola.error({
      message: `Errorr in running discord deleting rule command: ${err}`,
      badge: true,
    });
  }
};
