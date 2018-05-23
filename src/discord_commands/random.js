const reload = require('require-reload')(require);

const getRandomWord = reload('./../common/get_random_word.js');
const jishoWordSearch = reload('./../common/jisho_word_search.js');
const constants = reload('./../common/constants.js');
const jishoSearch = reload('./../common/jisho_search.js');

const NUMBER_OF_RETRIES = 5;

function createJishoNotRespondingResponse() {
  return {
    embed: {
      title: 'Sorry, Jisho is not responding, please try again later.',
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

async function getRandomWordRecusive(suffix, msg, retriesRemaining, logger, navigationManager) {
  if (retriesRemaining <= 0) {
    // It's not necessarily true that Jisho isn't responding, but if we fail to look up 5
    // random words in a row on Jisho, it's highly likely that the problem is on their end.
    logger.logFailure('RANDOM WORD', `Failed to get a random word ${NUMBER_OF_RETRIES} times`);
    return msg.channel.createMessage(createJishoNotRespondingResponse(), null, msg);
  }
  const word = getRandomWord(suffix);
  try {
    const data = await jishoWordSearch(word);
    if (!data.hasResults) {
      return getRandomWordRecusive(suffix, msg, retriesRemaining - 1, logger);
    }
    return jishoSearch.createNavigationForJishoResults(
      msg,
      msg.author.username,
      msg.author.id,
      data,
      navigationManager,
    );
  } catch (err) {
    logger.logFailure('RANDOM WORD', `Failed to find ${word}`);
    return getRandomWordRecusive(suffix, msg, retriesRemaining - 1, logger);
  }
}

module.exports = {
  commandAliases: ['k!random', 'k!r'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'randomword49390',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for a random word. You can specify a JLPT or 漢検 level if you want.',
  longDescription: 'Search Jisho for a random word. You can specify a JLPT or 漢検 level. The available levels are: N1, N2, N3, N4, N5, 10k, 9k, 8k, 7k, 6k, 5k, 4k, 3k, j2k, 2k, j1k, 1k',
  usageExample: '\'k!random N3\', \'k!random 2k\'',
  action(erisBot, msg, suffix, monochrome) {
    const suffixLowerCase = suffix.toLowerCase();
    return getRandomWordRecusive(suffixLowerCase, msg, NUMBER_OF_RETRIES, monochrome.getLogger(), monochrome.getNavigationManager());
  },
};