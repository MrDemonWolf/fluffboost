const consola = require('consola');

const DiscordGuild = require('../../../../modals/DiscordGuild');

const { info, success } = require('../../../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info(
      'rules manage unpublish command',
      interaction.user.username,
      interaction.user.id
    );

    const { guild } = interaction;

    const discordGuild = await DiscordGuild.findOne({
      guildId: guild.id,
      'rules.channelId': { $exists: true },
    });

    if (!discordGuild) {
      await interaction.reply({
        content:
          'No rules channel found. Please set one first before unpublish.',
        ephemeral: true,
      });
      return;
    }

    if (!discordGuild.rules.messageId) {
      await interaction.reply({
        content: 'Rules already unpublished. Please publish first.',
        ephemeral: true,
      });
      return;
    }

    const rulesChannel = guild.channels.cache.get(discordGuild.rules.channelId);
    const message = await rulesChannel.messages.fetch(
      discordGuild.rules.messageId
    );

    await message.delete();

    await DiscordGuild.findOneAndUpdate(
      {
        guildId: guild.id,
      },
      {
        $unset: {
          'rules.channeklId': '',
          'rules.messageId': '',
        },
      }
    );

    await interaction.reply({
      content: 'Rules unpublished.',
      ephemeral: true,
    });

    success(
      'rules manage unpublish command',
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    consola.error({
      message: `Error in running discord rules manage unpublish command: ${err}`,
      badge: true,
    });
  }
};
