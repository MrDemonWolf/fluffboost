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

    const channelId = interaction.options.getChannel('channel').id;

    await DiscordGuild.findOneAndUpdate(
      {
        guildId: interaction.guild.id,
      },
      {
        rules: {
          channelId,
        },
      },
      {
        upsert: true,
      }
    );

    await interaction.reply({
      content: `Rules successfully linked to <#${channelId}>`,
      ephemeral: true,
    });

    success(
      'rules deploy unlink command',
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    consola.error({
      message: `Errorr in running discord linking rules command: ${err}`,
      badge: true,
    });
  }
};
