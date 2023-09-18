const consola = require('consola');

const { EmbedBuilder } = require('discord.js');
const { info, success } = require('../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info('bot command', interaction.user.username, interaction.user.id);

    const { guild } = interaction;

    const { username, id, avatar } = client.user;

    const totalMembers = guild.members.cache.size.toString();

    const totalBots = guild.members.cache
      .filter((member) => member.user.bot)
      .size.toString();

    const totalHumans = totalMembers - totalBots.toString();

    const totalChannels = guild.channels.cache.size.toString();

    const totalTextChannels = guild.channels.cache
      .filter((channel) => channel.type === 'GUILD_TEXT')
      .size.toString();

    const totalVoiceChannels = guild.channels.cache
      .filter((channel) => channel.type === 'GUILD_VOICE')
      .size.toString();

    const totalCategories = guild.channels.cache
      .filter((channel) => channel.type === 'GUILD_CATEGORY')
      .size.toString();

    const totalRoles = guild.roles.cache.size.toString();

    // uptime in discord fancy format
    const style = 'R';
    const uptime = `<t:${Math.floor(client.readyAt / 1000)}${
      style ? `:${style}` : ''
    }>`.toString();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${username} Info`)
      .setDescription(
        'A simple community bot for MrDemonWolf, Inc Discord Server and Twitch Community Chat'
      )
      // set the thumbnail of the embed to bot avatar
      .setThumbnail(
        `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`
      )
      .setTimestamp()
      .addFields(
        {
          name: 'Uptime',
          value: uptime,
          inline: true,
        },
        {
          name: 'Total Members',
          value: totalMembers,
          inline: true,
        },
        {
          name: 'Total Bots',
          value: totalBots,
          inline: true,
        },
        {
          name: 'Total Humans',
          value: totalHumans,
          inline: true,
        },
        {
          name: 'Total Channels',
          value: totalChannels,
          inline: true,
        },
        {
          name: 'Total Text Channels',
          value: totalTextChannels,
          inline: true,
        },
        {
          name: 'Total Voice Channels',
          value: totalVoiceChannels,
          inline: true,
        },
        {
          name: 'Total Categories',
          value: totalCategories,
          inline: true,
        },
        {
          name: 'Total Roles',
          value: totalRoles,
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
      });

    await interaction.reply({
      embeds: [embed],
    });

    success('bot command', interaction.user.username, interaction.user.id);
  } catch (err) {
    consola.error({
      message: `Error in running discord bot command: ${err}`,
      badge: true,
    });
  }
};
