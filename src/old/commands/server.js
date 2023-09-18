const consola = require('consola');

const { EmbedBuilder } = require('discord.js');
const { info, success } = require('../../utils/discord/commands/log');

module.exports = async (client, interaction) => {
  try {
    info('server command', interaction.user.username, interaction.user.id);

    const { guild } = interaction;

    const { name, icon, id, description, ownerId } = guild;

    // convert discord snowflake to date
    const createdAt = new Date(parseInt(id, 10) / 4194304 + 1420070400000);

    // convert date to discord fancy format
    const style = 'R';
    const createdAtFormatted = `<t:${Math.floor(createdAt / 1000)}${
      style ? `:${style}` : ''
    }>`.toString();

    // uptime in discord fancy format
    const uptime = `<t:${Math.floor(client.readyAt / 1000)}${
      style ? `:${style}` : ''
    }>`.toString();

    // total members in server
    const totalMembers = guild.members.cache.size.toString();

    // total bots in server
    const totalBots = guild.members.cache
      .filter((member) => member.user.bot)
      .size.toString();

    // total humans in server
    const totalHumans = totalMembers - totalBots.toString();

    // total channels in server
    const totalChannels = guild.channels.cache.size.toString();

    // total text channels in server
    const totalTextChannels = guild.channels.cache
      .filter((channel) => channel.type === 'GUILD_TEXT')
      .size.toString();

    // total voice channels in server
    const totalVoiceChannels = guild.channels.cache
      .filter((channel) => channel.type === 'GUILD_VOICE')
      .size.toString();

    // total categories in server
    const totalCategories = guild.channels.cache
      .filter((channel) => channel.type === 'GUILD_CATEGORY')
      .size.toString();

    // total roles in server
    const totalRoles = guild.roles.cache.size.toString();

    // total emojis in server
    const totalEmojis = guild.emojis.cache.size.toString();

    // total boosts in server
    const totalBoosts = guild.premiumSubscriptionCount.toString();

    // total boosters in server
    const totalBoosters = guild.premiumSubscriptionCount.toString();

    // total boost tier in server
    const totalBoostTier = guild.premiumTier.toString();

    // list of roles in server
    const roles = guild.roles.cache
      .sort()
      .map((role) => role.toString())
      .join(', ');

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${name} Info`)
      .setDescription(description)
      // set the thumbnail of the embed to server icon
      .setThumbnail(
        `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=256`
      )
      .addFields(
        {
          name: 'Owner',
          value: `<@${ownerId}>`,
          inline: true,
        },
        {
          name: 'Created At',
          value: createdAtFormatted,
          inline: true,
        },
        {
          name: 'Bot Uptime',
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
        },
        {
          name: 'Total Emojis',
          value: totalEmojis,
          inline: true,
        },
        {
          name: 'Total Boosts',
          value: totalBoosts,
          inline: true,
        },
        {
          name: 'Total Boosters',
          value: totalBoosters,
          inline: true,
        },
        {
          name: 'Total Boost Tier',
          value: totalBoostTier,
          inline: true,
        },
        {
          name: 'Roles',
          value: roles.toString(),
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
      });

    await interaction.reply({
      embeds: [embed],
    });

    success('server command', interaction.user.username, interaction.user.id);
  } catch (err) {
    consola.error({
      message: `Error in running discord bot command: ${err}`,
      badge: true,
    });
  }
};
