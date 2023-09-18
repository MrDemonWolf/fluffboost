const consola = require('consola');

const { ActivityType } = require('discord.js');

module.exports = async (client) => {
  try {
    client.user.setActivity(process.env.DISCORD_ACTIVITY, {
      type: ActivityType[process.env.DISCORD_ACTIVITY_TYPE],
      url: process.env.DISCORD_ACTIVITY_URL,
    });
    consola.success({
      message: 'Discord has been activity set',
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error setting custom discord activity: ${err}`,
      badge: true,
    });
  }
};
