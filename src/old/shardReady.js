const consola = require('consola');

const activity = require('./activity');
const commands = require('./commands');

module.exports = async (client) => {
  try {
    consola.success({
      message: `Discord Bot Shard ${client.shard.ids[0]} Logged in as ${client.user.tag}`,
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error shardReady discord bot: ${err}`,
      badge: true,
    });
  }
};
