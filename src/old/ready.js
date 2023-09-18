const consola = require('consola');

const activity = require('./activity');
const commands = require('./commands');

module.exports = async (client) => {
  try {
    // set activity
    activity(client);

    // set commands
    commands(client);

    consola.success({
      message: `Discord Bot Logged in as ${client.user.tag}`,
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error ready discord bot: ${err}`,
      badge: true,
    });
  }
};
