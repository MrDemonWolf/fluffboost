const consola = require('consola');

const link = require('./link');
const unlink = require('./unlink');

module.exports = async (client, interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'link':
        await link(client, interaction);
        break;
      case 'unlink':
        await unlink(client, interaction);
        break;
      default:
        consola.error({
          message: `Unknown subcommand: ${subcommand}`,
          badge: true,
        });
        break;
    }
  } catch (err) {
    consola.error({
      message: `Errorr setting discord rules deploy interactions: ${err}`,
      badge: true,
    });
  }
};
