const consola = require('consola');

const DiscordGuild = require('../modals/DiscordGuild');

module.exports = async (client, guild) => {
  try {
    // send welcome message
    guild.systemChannel.send(
      `Hello, I'm **${client.user.username}**. I'm a bot that can help you manage your server. To get started, type \`/help\`.`
    );

    // create new guild
    const newGuild = new DiscordGuild({
      guildId: guild.id,
    });

    // save new guild
    await newGuild.save();

    consola.info({
      message: `Joined new discord guild: ${guild.name}`,
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error joining new discord guild: ${err}`,
      badge: true,
    });
  }
};
