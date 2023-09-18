const consola = require('consola');

const DiscordGuild = require('../../../../modals/DiscordGuild');
const { info, success } = require('../../../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info(
      'rules deploy unlink command',
      interaction.user.username,
      interaction.user.id
    );

    const manageId = await DiscordGuild.findOne({
      guildId: interaction.guild.id,
      rules: {
        messageId: {
          $exists: true,
        },
      },
    });

    if (!manageId) {
      const message = await interaction.guild.channels.cache
        .get(manageId.rules.channelId)
        .messages.fetch(manageId.rules.messageId);

      await message.delete();
    }

    await DiscordGuild.findOneAndUpdate(
      {
        guildId: interaction.guild.id,
      },
      {
        rules: null,
      },
      {
        upsert: true,
      }
    );

    await interaction.reply({
      content: `Rules successfully unlinked.`,
      ephemeral: true,
    });

    success(
      'rules deploy unlink command',
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    consola.error({
      message: `Errorr in running discord unlinking rules command: ${err}`,
      badge: true,
    });
  }
};
