/* eslint-disable no-case-declarations */
const consola = require('consola');

const add = require('./create');
const list = require('./list');
const remove = require('./delete');
const clear = require('./clear');
const edit = require('./edit');
const publish = require('./publish');
const unpublish = require('./unpublish');

module.exports = async (client, interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        await add(client, interaction);
        break;
      case 'list':
        await list(client, interaction);
        break;
      case 'edit':
        await edit(client, interaction);
        break;
      case 'delete':
        await remove(client, interaction);
        break;
      case 'clear':
        await clear(client, interaction);
        break;
      case 'publish':
        await publish(client, interaction);
        break;
      case 'unpublish':
        await unpublish(client, interaction);
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
      message: `Errorr setting discord rules manage interactions: ${err}`,
      badge: true,
    });
  }
};
