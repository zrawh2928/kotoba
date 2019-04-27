const mongoose = require('mongoose');

const scoreType = {
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  score: { type: Number, required: true },
};

const gameReportSchema = new mongoose.Schema({
  sessionName: { type: String, required: true },
  startTime: { type: Date, required: true, index: true, expires: 60 * 24 * 60 * 60 * 1000 },
  endTime: { type: Date, required: true },
  participants: { type: [{ type:  mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true }], required: true, index: true },
  discordServerIconUri: { type: String },
  discordServerName: { type: String },
  discordChannelName: { type: String, required: true },
  scores: { type: [scoreType], required: true },
  questions: [{
    question: { type: String, required: true },
    answers: { type: [String], required: true },
    comment: { type: String, default: '' },
    canCopyToCustomDeck: { type: Boolean, default: false },
    questionCreationStrategy: { type: String, required: true },
    instructions: { type: String, default: '' },
    linkQuestion: { type: Boolean, default: false },
    uri: { type: String, default: '' },
    correctAnswerers: [{ type: [mongoose.Schema.Types.ObjectId], required: true, ref: 'User' }],
  }],
});

function create(connection) {
  return connection.model('GameReport', gameReportSchema);
}

module.exports = create;