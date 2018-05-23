const reload = require('require-reload')(require);

const ScoreStorageUtils = reload('./../common/quiz/score_storage_utils.js');
const constants = reload('./../common/constants.js');
const {
  NavigationChapter,
  Navigation,
} = reload('monochrome-bot');

const MAX_SCORERS_PER_PAGE = 20;
const HELP_DESCRIPTION = 'Say **k!help lb** for help viewing leaderboards.';

const deckNamesForGroupAlias = {
  anagrams: [
    'anagrams3',
    'anagrams4',
    'anagrams5',
    'anagrams6',
    'anagrams7',
    'anagrams8',
    'anagrams9',
    'anagrams10',
  ],
  jlpt: [
    'n1',
    'n2',
    'n3',
    'n4',
    'n5',
  ],
  kanken: [
    '1k',
    'j1k',
    '2k',
    'j2k',
    '3k',
    '4k',
    '5k',
    '6k',
    '7k',
    '8k',
    '9k',
    '10k',
  ],
};

function createFieldForScorer(index, username, score) {
  return {
    name: `${(index + 1).toString()}) ${username}`,
    value: `${score.toString()} points`,
    inline: true,
  };
}

function createScoreTotalString(scores) {
  let scoreTotal = 0;
  const users = {};
  scores.forEach((score) => {
    scoreTotal += score.score;
    users[score.username] = true;
  });

  const usersTotal = Object.keys(users).length;
  const scoreTotalString = scoreTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${scoreTotalString} points have been scored by ${usersTotal} players.`;
}

function sendScores(msg, scores, title, description, footer, navigationManager) {
  const navigationContents = [];
  const numPages = scores.length % MAX_SCORERS_PER_PAGE === 0 ?
    Math.max(scores.length / MAX_SCORERS_PER_PAGE, 1) :
    Math.floor(scores.length / MAX_SCORERS_PER_PAGE) + 1;

  const sortedScores = scores.sort((a, b) => b.score - a.score);

  for (let pageIndex = 0; pageIndex < numPages; pageIndex += 1) {
    const elementStartIndex = pageIndex * MAX_SCORERS_PER_PAGE;
    const elementEndIndex = Math.min(
      ((pageIndex + 1) * MAX_SCORERS_PER_PAGE) - 1,
      sortedScores.length - 1,
    );

    const content = {
      embed: {
        title,
        description: `${description}\n${createScoreTotalString(scores)}\n${HELP_DESCRIPTION}`,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [],
      },
    };
    if (footer) {
      content.embed.footer = footer;
    }

    for (let i = elementStartIndex; i <= elementEndIndex; i += 1) {
      let userName = sortedScores[i].username;
      const { score } = sortedScores[i];
      if (!userName) {
        userName = '<Name Unknown>';
      }
      content.embed.fields.push(createFieldForScorer(i, userName, score));
    }

    const commandInvokersRow = sortedScores.find(row => row.userId === msg.author.id);

    if (commandInvokersRow) {
      const commandInvokersIndex = sortedScores.indexOf(commandInvokersRow);

      if (commandInvokersIndex < elementStartIndex || commandInvokersIndex > elementEndIndex) {
        content.embed.fields.push(createFieldForScorer(
          commandInvokersIndex,
          commandInvokersRow.username,
          commandInvokersRow.score,
        ));
      }
    }

    navigationContents.push(content);
  }

  const navigationChapter = NavigationChapter.fromContent(navigationContents);
  const chapterForReaction = { a: navigationChapter };
  const hasMultiplePages = navigationContents.length > 1;
  const authorId = msg.author.id;
  const navigation = new Navigation(authorId, hasMultiplePages, 'a', chapterForReaction);
  return navigationManager.register(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg);
}

function notifyDeckNotFound(msg, isGlobal, deckName) {
  const content = {
    embed: {
      title: 'Leaderboard',
      description: `I don't have a deck named **${deckName}**.`,
      color: constants.EMBED_WRONG_COLOR,
    },
  };

  return msg.channel.createMessage(content);
}

function getDeckNamesArray(deckNamesString) {
  const deckNamesStringTrimmed = deckNamesString.trim();
  const didSpecifyDecks = !!deckNamesStringTrimmed;
  if (!didSpecifyDecks) {
    return [];
  }

  const deckNamesArray = deckNamesStringTrimmed.split(/ *\+ */);

  const deckNamesArrayUnaliased = [];
  for (let i = 0; i < deckNamesArray.length; i += 1) {
    const deckName = deckNamesArray[i];
    const deckNames = deckNamesForGroupAlias[deckName];
    if (deckNames) {
      deckNamesArrayUnaliased.push(...deckNames);
    } else {
      deckNamesArrayUnaliased.push(deckName);
    }
  }

  return deckNamesArrayUnaliased;
}

function getDeckNamesTitlePart(deckNamesArray) {
  let deckNamesTitlePart = '';
  if (deckNamesArray.length > 0) {
    deckNamesTitlePart = deckNamesArray.slice(0, 5).join(', ');
    if (deckNamesArray.length > 5) {
      deckNamesTitlePart += ', ...';
    }

    deckNamesTitlePart = ` (${deckNamesTitlePart})`;
  }

  return deckNamesTitlePart;
}

function createFooter(text) {
  return {
    text,
    icon_url: constants.FOOTER_ICON_URI,
  };
}

module.exports = {
  commandAliases: ['k!leaderboard', 'k!lb'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'leaderboard409359',
  shortDescription: 'View leaderboards for quiz and/or shiritori',
  longDescription: 'View leaderboards for quiz and/or shiritori. I keep track of scores per server and per deck. Here are some example commands:\n\n**k!lb** - View all quiz scores in this server\n**k!lb shiritori** - View shiritori scores in this server\n**k!lb global** - View all quiz scores globally\n**k!lb global N1** - View the global leaderboard for the N1 quiz deck\n**k!lb global N1+N2+N3** - View the combined global leaderboard for the N1, N2, and N3 decks.\n\nThere are also three deck groups that you can view easily like this:\n\n**k!lb anagrams**\n**k!lb jlpt**\n**k!lb kanken**',
  action: async function action(erisBot, msg, suffix, monochrome) {
    let title = '';
    let footer = {};
    let description = '';
    let scoresResult;

    let suffixReplaced = suffix.toLowerCase();
    const isGlobal = suffixReplaced.indexOf('global') !== -1 || !msg.channel.guild;

    suffixReplaced = suffixReplaced.replace(/global/g, '');
    const deckNamesArray = getDeckNamesArray(suffixReplaced);
    const didSpecifyDecks = deckNamesArray.length > 0;
    const deckNamesTitlePart = getDeckNamesTitlePart(deckNamesArray);

    if (isGlobal) {
      title = `Global leaderboard${deckNamesTitlePart}`;
      description = 'The top scorers in the whole wide world.';

      if (!didSpecifyDecks) {
        footer = createFooter('Say \'k!lb global deckname\' to see the global leaderboard for a deck.');
      }

      scoresResult = await ScoreStorageUtils.getGlobalScores(deckNamesArray);
    } else {
      title = `Server leaderboard for **${msg.channel.guild.name}** ${deckNamesTitlePart}`;
      description = 'The top scorers in this server.';
      footer = createFooter('Say \'k!lb global\' to see the global leaderboard. Say \'k!lb deckname\' to see a deck leaderboard.');
      scoresResult = await ScoreStorageUtils.getServerScores(msg.channel.guild.id, deckNamesArray);
    }

    if (scoresResult.unfoundDeckName !== undefined) {
      return notifyDeckNotFound(msg, isGlobal, scoresResult.unfoundDeckName);
    }

    if (!footer.text) {
      footer = createFooter('You can mix any decks by using the + symbol. For example: k!lb N5+N4+N3');
    }

    return sendScores(msg, scoresResult.rows, title, description, footer, monochrome.getNavigationManager());
  },
};