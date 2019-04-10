// Adapted from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
  const newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newArray[i];
    newArray[i] = newArray[j];
    newArray[j] = temp;
  }
  return newArray;
}

function createSequenceForDeck(deck) {
  const indices = [];
  const startIndex = deck.startIndex || 1;
  const endIndex = deck.endIndex || deck.cards.length;
  const indices = Array((endIndex - startIndex) + 1);
  for (let i = startIndex; i <= endIndex; i += 1) {
    indices[i - startIndex] = i - 1;
  }

  shuffleArray(indices);
  return indices;
}

function createSequenceForDeckId(decks) {
  const sequenceForDeckId = {};
  decks.forEach((deck) => {
    sequenceForDeckId[deck.uniqueId] = createSequenceForDeck(deck);
  });

  return sequenceForDeckId;
}

function createNew(decks) {
  return {
    deckUniqueIds: decks.map(deck => deck.uniqueId),
    sequenceForDeckId: createSequenceForDeckId(decks),
    started: false,
    settings: {},
  };
}

module.exports = {
  createNew,
};
