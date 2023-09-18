const consola = require('consola');

const { EmbedBuilder } = require('discord.js');
const { info, success } = require('../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info('user command', interaction.user.username, interaction.user.id);

    const { guild } = interaction;

    const { username, id, avatar } = interaction.user;

    // convert discord snowflake to date
    const createdAt = new Date(parseInt(id, 10) / 4194304 + 1420070400000);

    // convert date to discord fancy format
    const style = 'R';
    const createdAtFormatted = `<t:${Math.floor(createdAt / 1000)}${
      style ? `:${style}` : ''
    }>`.toString();

    // user roles
    const roles = guild.members.cache
      .get(interaction.user.id)
      .roles.cache.map((role) => role.name)
      .join(', ')
      .toString();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${username} Info`)
      .setThumbnail(`https://cdn.discordapp.com/avatars/${id}/${avatar}.png`)
      .addFields(
        {
          name: 'Username',
          value: `<@${id}>`,
          inline: true,
        },
        {
          name: 'Created At',
          value: createdAtFormatted,
          inline: true,
        },
        {
          name: 'Roles',
          value: roles,
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
      });

    consola.success({
      message: `* Successfully executed user command from ${interaction.user.username} (${interaction.user.id})`,
    });

    await interaction.reply({
      embeds: [embed],
    });
    success('user command', interaction.user.username, interaction.user.id);
  } catch (err) {
    consola.error({
      message: `Error in running discord user command: ${err}`,
      badge: true,
    });
  }
};
