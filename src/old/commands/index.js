const consola = require('consola');

const bot = require('./bot');
const server = require('./server');
const user = require('./user');
const rules = require('./rules');

module.exports = (client) => {
  try {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      switch (commandName) {
        case 'server':
          await server(client, interaction);
          break;
        case 'user':
          await user(client, interaction);
          break;
        case 'bot':
          await bot(client, interaction);
          break;
        case 'rules':
          await rules(client, interaction);
          break;

        default:
          consola.warn({
            message: `Unknown command: ${commandName}`,
            badge: true,
          });
      }
    });
  } catch (err) {
    consola.error({
      message: `Error setting discord commands interactions: ${err}`,
      badge: true,
    });
  }
};
