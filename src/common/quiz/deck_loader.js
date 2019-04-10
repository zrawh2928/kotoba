const assert = require('assert');
const arrayOnDisk = require('disk-array');
const decksMetadata = require('./../../../generated/quiz/decks.json');

const REVIEW_DECK_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const DISK_ARRAY_CACHE_SIZE_IN_PAGES = 1000;

const ErrorCodes = {
  NoReviewDeck: 'deck_loader_NO_SUCH_REVIEW_DECK',
};

const deckCache = {};

class DeckCacheEntry {
  static insertCacheEntry(cacheKeys, deck, cacheDurationMs) {
    const cacheKeysUnique = cacheKeys.filter((x, i) => cacheKeys.indexOf(x) === i);
    const cacheEntry = new DeckCacheEntry();
    cacheEntry.cacheKeys = cacheKeysUnique;
    cacheEntry.deck = deck;
    cacheEntry.cacheDurationMs = cacheDurationMs;

    if (cacheDurationMs) {
      cacheEntry.expirationTimer = setTimeout(() => cacheEntry.removeFromCache(), cacheDurationMs);
    }

    const entriesToReplace = cacheKeysUnique.map(key => deckCache[key]).filter(x => x);
    entriesToReplace.forEach(entry => entry.removeFromCache());

    cacheKeysUnique.forEach((key) => {
      assert(!deckCache[key], 'Key already exists in cache.');
      deckCache[key] = cacheEntry;
    });
  }

  removeFromCache() {
    clearTimeout(this.expirationTimer);
    this.cacheKeys.forEach((key) => {
      assert(deckCache[key] === this, 'Entry for key does not match this.');
      delete deckCache[key];
    });
  }

  resetExpiration() {
    if (this.cacheDurationMs) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = setTimeout(() => this.removeFromCache(), this.cacheDurationMs);
    }
  }
}

function createCardGetterFromInMemoryArray(array) {
  return {
    get: i => Promise.resolve(array[i]),
    length: array.length,
    memoryArray: array,
  };
}

function createCardGetterFromDiskArray(array) {
  return array;
}

async function loadDecks() {
  const deckNames = Object.keys(decksMetadata);
  const diskArrayCache = new arrayOnDisk.Cache(DISK_ARRAY_CACHE_SIZE_IN_PAGES);

  for (let i = 0; i < deckNames.length; i += 1) {
    const deckName = deckNames[i];

    try {
      const deckMetadata = decksMetadata[deckName];
      if (!deckMetadata.uniqueId || deckCache[deckMetadata.uniqueId]) {
        throw new Error(`Deck ${deckName} does not have a unique uniqueId, or doesn't have one at all.`);
      }

      // Await makes this code simpler, and the performance is irrelevant.
      // eslint-disable-next-line no-await-in-loop
      const diskArray = await arrayOnDisk.load(deckMetadata.cardDiskArrayPath, diskArrayCache);
      const deck = { ...deckMetadata };
      deck.cards = createCardGetterFromDiskArray(diskArray);
      deck.isInternetDeck = false;

      DeckCacheEntry.insertCacheEntry([deckName, deckMetadata.uniqueId], deck);
    } catch (err) {
      console.warn(`Error loading deck: ${deckName}`);
      throw err;
    }
  }
}

loadDecks().catch(err => {
  console.warn(err);
  process.exit(1);
});

async function getDeck(keyword) {
  const keywordLowercase = keyword.toLowerCase();
  const deckCacheEntry = deckCache[keywordLowercase];

  if (deckCacheEntry) {
    deckCacheEntry.resetExpiration();
    return deckCacheEntry.deck;
  }

  // TODO: Search for internet deck

  throw new Error('TODO');
}

function getLocationReviewDeckKey(locationId) {
  return `LOCATION_REVIEW_DECK_${locationId}`;
}

function getUserReviewDeckKey(userId) {
  return `USER_REVIEW_DECK_${userId}`;
}

function getReviewDeck(key) {
  const cacheEntry = deckCache[key];

  if (cacheEntry) {
    cacheEntry.removeFromCache();
    return cacheEntry.deck;
  }
  
  throw new Error(ErrorCodes.NoReviewDeck);
}

function getLocationReviewDeck(locationId) {
  const key = getLocationReviewDeckKey(locationId);
  return getReviewDeck(key);
}

function getUserReviewDeck(userId) {
  const key = getUserReviewDeckKey(userId);
  return getReviewDeck(key);
}

async function deleteDeck(keyword, userId) {
  // TODO: Delete internet deck
}

function registerReviewDeck(key, cards) {
  const deck = {
    uniqueId: 'REVIEW',
    name: 'Review Quiz',
    article: 'a',
    requiresAudioConnection: cards.some(card => card.requiresAudioConnection),
    isInternetDeck: cards.some(card => card.isInternetCard),
    cards: createCardGetterFromInMemoryArray(cards),
  };

  DeckCacheEntry.insertCacheEntry([key], deck, REVIEW_DECK_CACHE_DURATION_MS);
}

function registerLocationReviewDeck(locationId, cards) {
  const key = getLocationReviewDeckKey(locationId);
  registerReviewDeck(key, cards);
}

function registerUserReviewDeck(userId, cards) {
  const key = getUserReviewDeckKey(userId);
  registerReviewDeck(key, cards);
}

module.exports = {
  getDeck,
  getLocationReviewDeck,
  getUserReviewDeck,
  deleteDeck,
  registerLocationReviewDeck,
  registerUserReviewDeck,
};
