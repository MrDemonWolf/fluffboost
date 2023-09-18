const consola = require('consola');

const manage = require('./manage');
const channel = require('./channel');

module.exports = async (client, interaction) => {
  try {
    const getSubcommandGroup = interaction.options.getSubcommandGroup();

    switch (getSubcommandGroup) {
      case 'manage':
        await manage(client, interaction);
        break;
      case 'channel':
        await channel(client, interaction);
        break;
      default:
        consola.error({
          message: `Unknown subcommand group: ${getSubcommandGroup}`,
          badge: true,
        });
    }
  } catch (err) {
    consola.error({
      message: `Errorr in running setting discord rules interactions: ${err}`,
      badge: true,
    });
  }
};
