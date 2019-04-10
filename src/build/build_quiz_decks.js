const diskArray = require('disk-array');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_FROM = 'Reading Quiz';
const LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_TO = 'Listening Vocabulary Quiz';
const LISTENING_VOCAB_DECK_INSTRUCTIONS = 'Listen to the audio and type the word (**in Kanji**)';
const LISTENING_VOCAB_DECK_QUESTION_CREATION_STRATEGY = 'FORVO_AUDIO_FILE';
const LISTENING_VOCAB_DECK_CARD_PREPROCESSING_STRATEGY = 'FORVO_AUDIO';
const LISTENING_VOCAB_DECK_DICTIONARY_LINK_STRATEGY = 'JISHO_ANSWER_WORD';
const LISTENING_VOCAB_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY = 'FORVO_AUDIO_LINK';
const LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX = 'lv';
const LISTENING_VOCAB_DECK_SETTINGS_GROUP = 'listening vocabulary';

const listeningVocabDeckSourceDeckNames = [
  'n1',
  'n2',
  'n3',
  'n4',
  'n5',
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
];

const MEANING_DECK_NAME_REPLACE_STRING_FROM = 'Reading Quiz';
const MEANING_DECK_NAME_REPLACE_STRING_TO = 'Meaning Quiz';
const MEANING_DECK_NAME_SHORT_SUFFIX = 'm';
const MEANING_DECK_COMMENT_FIELD_NAME = 'Reading';
const MEANING_DECK_SETTINGS_GROUP = 'word_meaning';

const meaningDeckSourceDeckNames = [
  'n1',
  'n2',
  'n3',
  'n4',
  'n5',
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
  'animals',
  'birds',
  'bugs',
  'common',
  'countries',
  'fish',
  'hard',
  'kklc',
  'vegetables',
  'plants',
  'kokuji',
];

function getPathForQuizDeckFile(fileName) {
  return path.resolve(__dirname, '..', '..', 'resources', 'quiz_data', fileName || '');
}

function getDiskArrayDirectoryForDeckName(deckName) {
  return path.resolve(__dirname, '..', '..', 'generated', 'quiz', 'decks', deckName);
}

async function createMeaningDeck(deckDataForDeckName, sourceDeck, sourceFileName) {
  if (meaningDeckSourceDeckNames.indexOf(sourceFileName) === -1) {
    return deckDataForDeckName;
  }

  const deckDataForDeckNameCopy = { ...deckDataForDeckName };
  const sourceDeckCopy = JSON.parse(JSON.stringify(sourceDeck));

  sourceDeckCopy.uniqueId = `${sourceDeckCopy.uniqueId}${MEANING_DECK_NAME_SHORT_SUFFIX}`;
  sourceDeckCopy.commentFieldName = MEANING_DECK_COMMENT_FIELD_NAME;
  sourceDeckCopy.settingsGroup = MEANING_DECK_SETTINGS_GROUP;
  sourceDeckCopy.name = sourceDeckCopy.name.replace(
    MEANING_DECK_NAME_REPLACE_STRING_FROM,
    MEANING_DECK_NAME_REPLACE_STRING_TO,
  );
  sourceDeckCopy.forceMC = true;

  sourceDeckCopy.cards = sourceDeckCopy.cards
    .filter(card => card && card.meaning)
    .map(card => ({
      question: card.question,
      answer: [card.meaning],
      meaning: card.answer[0],
    }));

  const meaningDeckName = `${sourceFileName}${MEANING_DECK_NAME_SHORT_SUFFIX}`;
  const meaningDeckDiskArrayDirectory = getDiskArrayDirectoryForDeckName(meaningDeckName);

  await diskArray.create(sourceDeckCopy.cards, meaningDeckDiskArrayDirectory);
  delete sourceDeckCopy.cards;
  sourceDeckCopy.cardDiskArrayPath = meaningDeckDiskArrayDirectory;
  deckDataForDeckNameCopy[meaningDeckName] = sourceDeckCopy;

  return deckDataForDeckNameCopy;
}

async function createWordIdentificationDeck(deckDataForDeckName, sourceDeck, sourceFileName) {
  if (listeningVocabDeckSourceDeckNames.indexOf(sourceFileName) === -1) {
    return deckDataForDeckName;
  }

  const deckDataForDeckNameCopy = { ...deckDataForDeckName };
  const sourceDeckCopy = JSON.parse(JSON.stringify(sourceDeck));

  sourceDeckCopy.uniqueId = `${LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX}_${sourceDeckCopy.uniqueId}`;
  sourceDeckCopy.name = sourceDeckCopy.name.replace(
    LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_FROM,
    LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_TO,
  );

  sourceDeckCopy.cardPreprocessingStrategy = LISTENING_VOCAB_DECK_CARD_PREPROCESSING_STRATEGY;
  sourceDeckCopy.instructions = LISTENING_VOCAB_DECK_INSTRUCTIONS;
  sourceDeckCopy.questionCreationStrategy = LISTENING_VOCAB_DECK_QUESTION_CREATION_STRATEGY;
  sourceDeckCopy.dictionaryLinkStrategy = LISTENING_VOCAB_DECK_DICTIONARY_LINK_STRATEGY;
  sourceDeckCopy.settingsGroup = LISTENING_VOCAB_DECK_SETTINGS_GROUP;
  sourceDeckCopy.discordFinalAnswerListElementStrategy
    = LISTENING_VOCAB_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY;
  sourceDeckCopy.requiresAudioConnection = true;

  sourceDeckCopy.cards = sourceDeckCopy.cards
    .map(card => card && { ...card, answer: card.question });

  const wordIDDeckName = `${LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX}${sourceFileName}`;
  const wordIDDiskArrayDirectory = getDiskArrayDirectoryForDeckName(wordIDDeckName);

  await diskArray.create(sourceDeckCopy.cards, wordIDDiskArrayDirectory);
  delete sourceDeckCopy.cards;
  sourceDeckCopy.cardDiskArrayPath = wordIDDiskArrayDirectory;
  deckDataForDeckNameCopy[wordIDDeckName] = sourceDeckCopy;

  return deckDataForDeckNameCopy;
}

function writeFile(filePath, content) {
  return new Promise((fulfill, reject) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        return reject(err);
      }
      return fulfill();
    });
  });
}

function assertNoDuplicateCards(deckName, cards) {
  const seen = {};
  cards.filter(x => x).forEach((card) => {
    if (seen[card.question]) {
      throw new Error(`Duplicate question in ${deckName}: ${card.question}`);
    }
    seen[card.question] = true;
  });
}

async function build() {
  console.log('Building quiz data');

  mkdirp.sync(path.join(__dirname, '..', '..', 'generated', 'quiz', 'decks'));

  let deckDataForDeckName = {};

  // Build disk arrays for the quiz decks
  const quizDeckFileNames = fs.readdirSync(getPathForQuizDeckFile());
  for (let i = 0; i < quizDeckFileNames.length; i += 1) {
    const fileName = quizDeckFileNames[i];
    const deckName = fileName.replace('.json', '');
    const deckString = fs.readFileSync(getPathForQuizDeckFile(fileName), 'utf8');
    const deck = JSON.parse(deckString);

    const diskArrayDirectory = getDiskArrayDirectoryForDeckName(deckName);
    deck.cardDiskArrayPath = diskArrayDirectory;
    assertNoDuplicateCards(deckName, deck.cards);

    // We creates the arrays in sequence instead of in parallel
    // because that way there's less memory pressure.
    // eslint-disable-next-line no-await-in-loop
    await diskArray.create(deck.cards, diskArrayDirectory);
    // eslint-disable-next-line no-await-in-loop
    deckDataForDeckName = await createWordIdentificationDeck(deckDataForDeckName, deck, deckName);
    // eslint-disable-next-line no-await-in-loop
    deckDataForDeckName = await createMeaningDeck(deckDataForDeckName, deck, deckName);

    delete deck.cards;
    deckDataForDeckName[deckName] = deck;
  }

  const deckDataString = JSON.stringify(deckDataForDeckName, null, 2);
  await writeFile(path.join(__dirname, '..', '..', 'generated', 'quiz', 'decks.json'), deckDataString);
}

if (require.main === module) {
  build().then(() => {
    console.log('done');
    process.exit(0);
  }).catch((err) => {
    console.warn(err);
    process.exit(1);
  });
}

module.exports = build;
