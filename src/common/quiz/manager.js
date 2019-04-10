'use strict'
const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const assert = require('assert');
const saveManager = reload('./pause_manager.js');
const cardStrategies = reload('./card_strategies.js');
const retryPromise = reload('./../util/retry_promise.js');
const globals = require('./../globals.js');

const LOGGER_TITLE = 'QUIZ';

const INITIAL_DELAY_IN_MS = 5000;
const REVEAL_INTERVAL_IN_MS = 10000;
const MAX_SAVES_PER_USER = 5;
const QUIZ_END_STATUS_ERROR = 1;

/* LOADING AND INITIALIZATION */

if (!state.quizManager) {
  state.quizManager = {
    currentActionForLocationId: {},
    sessionForLocationId: {},
    messageSenderForLocationId: {},
  };
}

/* STOPPING */

function closeSession(session, gameOver) {
  if (!session) {
    return Promise.resolve();
  }

  let locationId = session.LocationId;

  delete state.quizManager.sessionForLocationId[locationId];
  delete state.quizManager.messageSenderForLocationId[locationId];
  delete state.quizManager.currentActionForLocationId[locationId];

  // TODO: Create review decks, commit scores
  if (gameOver) {
    
  }

  return Promise.resolve(session);
}

async function endQuiz(session, notifier, notifyDelegate, delegateArgument) {
  if (!session) {
    return Promise.resolve();
  }

  let locationId = session.locationId;
  if (state.quizManager.currentActionForLocationId[locationId]) {
    if (state.quizManager.currentActionForLocationId[locationId].stop) {
      state.quizManager.currentActionForLocationId[locationId].stop();
    }
    delete state.quizManager.currentActionForLocationId[locationId];
  }

  try {
    await closeSession(session, true);
    await retryPromise(() => {
      return Promise.resolve(notifyDelegate.call(notifier, session, delegateArgument));
    }, 3);
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Error ending quiz. Continuing and closing session.', err);
  }
}

function stopAllQuizzesCommand() {
  let allLocationIds = Object.keys(state.quizManager.sessionForLocationId);
  let promise = Promise.resolve();
  for (let locationId of allLocationIds) {
    let session = state.quizManager.sessionForLocationId[locationId];
    let messageSender = state.quizManager.messageSenderForLocationId[locationId];
    promise = promise.then(() => {
      return endQuiz(session, messageSender, messageSender.notifyStoppingAllQuizzes);
    }).catch(err => {
      globals.logger.logFailure(LOGGER_TITLE, 'Failed to send quiz stop message to location ID ' + locationId, err);
    });
  }

  return promise;
}

function stopQuizCommand(locationId, cancelingUserId, cancelingUserIsAdmin) {
  let session = state.quizManager.sessionForLocationId[locationId];

  if (session) {
    let messageSender = state.quizManager.messageSenderForLocationId[locationId];
    // TODO: Dont allow cancel if user is not admin or is not session owner, depending on the game type.
    return Promise.resolve(endQuiz(session, messageSender, messageSender.notifyQuizEndedUserCanceled, cancelingUserId));
  }
}

function skipCommand(locationId) {
  let action = state.quizManager.currentActionForLocationId[locationId];
  if (action && action.skip) {
    action.skip();
    return true;
  }
  return false;
}

function saveQuizCommand(locationId, savingUserId) {
  const session = state.quizManager.sessionForLocationId[locationId];
  if (!session) {
    return Promise.resolve(false);
  }

  // TODO: Dont allow save for review mode

  const ownerId = session.ownerId;
  if (savingUserId !== ownerId) {
    return session.getMessageSender().notifySaveFailedNotOwner();
  }

  return saveManager.getSaveMementos(savingUserId).then(mementos => {
    let hasSpace = mementos.length < MAX_SAVES_PER_USER;
    if (session.saveRequestedByUserId) {
      return;
    }

    const messageSender = state.quizManager.messageSenderForLocationId[locationId];
    if (hasSpace) {
      session.saveRequestedByUserId = savingUserId;
      return messageSender.notifySaving();
    } else {
      return messageSender.getMessageSender().notifySaveFailedNoSpace(MAX_SAVES_PER_USER);
    }
  });
}

function isSessionInProgressAtLocation(locationId) {
  return !!state.quizManager.sessionForLocationId[locationId];
}

function setSessionForLocationId(session, locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already have a session for that loction ID');
  state.quizManager.sessionForLocationId[locationId] = session;
}

function setMessageSenderForLocationId(messageSender, locationId) {
  assert(!state.quizManager.messageSenderForLocationId[locationId], 'Already a message sender registered for that location id');
  state.quizManager.messageSenderForLocationId[locationId] = messageSender;
}

/* ACTIONS */

class Action {
  constructor(session, messageSender) {
    this.session = session;
    this.messageSender = messageSender;
  }
}

class EndQuizForErrorAction extends Action {
  do() {
    try {
      globals.logger.logFailure(LOGGER_TITLE, 'Stopping for error');
      return Promise.resolve(endQuiz(this.session, this.messageSender, messageSender.notifyQuizEndedError)).catch(err => {
        globals.logger.logFailure(LOGGER_TITLE, 'Error ending quiz gracefully for error. Attempting to close session.');
        return Promise.resolve(closeSession(this.session, true)).then(() => {
          globals.logger.logSuccess(LOGGER_TITLE, 'Session closed successfully.');
          throw err;
        });
      });
    } catch (err) {
      globals.logger.logFailure(LOGGER_TITLE, 'Error ending quiz gracefully for error. Attempting to close session.');
      return Promise.resolve(closeSession(this.session, true)).then(() => {
        globals.logger.logSuccess(LOGGER_TITLE, 'Session closed successfully.');
        throw err;
      });
    }
  }
}

class EndQuizScoreLimitReachedAction extends Action {
  do() {
    let scoreLimit = this.session.getScores().getScoreLimit();
    return endQuiz(this.session, this.messageSender, this.messageSender.notifyQuizEndedScoreLimitReached, scoreLimit);
  }
}

class EndQuizNoQuestionsLeftAction extends Action {
  do() {
    return endQuiz(this.session, this.messageSender, this.messageSender.notifyQuizEndedNoQuestionsLeft, this.session.getGameMode());
  }
}

class EndQuizTooManyWrongAnswersAction extends Action {
  do() {
    return endQuiz(this.session, this.messageSender, this.messageSender.notifyQuizEndedTooManyWrongAnswers);
  }
}

class ShowAnswersAction extends Action {
  constructor(session, messageSender, timeLeft) {
    super(session, messageSender);
    this.timeLeft = timeLeft;
  }

  endTimeout() {
    if (this.timeoutEnded_) {
      return;
    }

    this.timeoutEnded_ = true;

    try {
      const currentCard = session.getCurrentCard();

      this.session.markCurrentCardAnswered();
      let scores = this.session.getScores();
      let answerersInOrder = scores.getCurrentQuestionAnswerersInOrder();
      let scoresForUser = scores.getAggregateScoreForUser();
      let answersForUser = scores.getCurrentQuestionsAnswersForUser();
      let pointsForAnswer = scores.getCurrentQuestionPointsForAnswer();
      let scoreLimit = scores.getScoreLimit();
      if (answerersInOrder.length > 0) {
        Promise.resolve(this.messageSender.outputQuestionScorers(
          currentCard,
          answerersInOrder,
          answersForUser,
          pointsForAnswer,
          scoresForUser,
          scoreLimit,
          )).catch(err => {
          globals.logger.logFailure(LOGGER_TITLE, 'Failed to output the scoreboard.', err);
        });
      } else {
        Promise.resolve(this.messageSender.showWrongAnswer(
          currentCard,
          false,
          true,
        )).catch(err => {
          globals.logger.logFailure(LOGGER_TITLE, 'Failed to output the scoreboard.', err);
        });
      }

      if (scores.checkForWin()) {
        this.fulfill_(new EndQuizScoreLimitReachedAction(this.session, this.messageSender));
      } else {
        this.fulfill_(new WaitAction(this.session, this.messageSender, currentCard.newQuestionDelayAfterAnsweredInMs, new AskQuestionAction(this.session)));
      }
    } catch (err) {
      this.reject_(err);
    }
  }

  do() {
    const currentCard = this.session.getCurrentCard();
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      this.reject_ = reject;
      const additionalAnswerWaitTimeInMs = this.session.isNoRace
        ? this.timeLeft
        : currentCard.additionalAnswerWaitTimeInMs;

      let timer = setTimeout(() => this.endTimeout(), additionalAnswerWaitTimeInMs);
      this.session.addTimer(timer);
    });
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }

  skip() {
    this.endTimeout();
  }

  tryAcceptUserInput(userId, userName, input) {
    const card = this.session.getCurrentCard();
    const oneAnswerPerPlayer = this.session.isHardcore || card.options;
    if (oneAnswerPerPlayer && this.session.answerAttempters.indexOf(userId) !== -1) {
      return false;
    }

    const inputAsInt = parseInt(input.replace(/\|\|/g, ''));
    if (!card.options || (!Number.isNaN(inputAsInt) && inputAsInt <= card.options.length)) {
      if (!Number.isNaN(inputAsInt) && card.options) {
        input = `${inputAsInt}`;
      }
      session.answerAttempters.push(userId);
      if (session.getOwnerId() === userId && oneAnswerPerPlayer) {
        return this.getSession_().tryAcceptAnswer(userId, userName, input);
      }
    }

    return this.getSession_().tryAcceptAnswer(userId, userName, input);
  }
}

class ShowWrongAnswerAction extends Action {
  constructor(session, skipped) {
    super(session);
    this.skipped_ = skipped;
  }

  do() {
    let session = this.getSession_();
    let currentCard = session.getCurrentCard();
    return Promise.resolve(session.getMessageSender().showWrongAnswer(currentCard, this.skipped_)).catch(err => {
      let question = currentCard.question;
      globals.logger.logFailure(LOGGER_TITLE, 'Failed to show timeout message for ' + question, err);
    }).then(() => {
      if (session.checkTooManyWrongAnswers()) {
        return new EndQuizTooManyWrongAnswersAction(session);
      } else {
        return new WaitAction(session, currentCard.newQuestionDelayAfterUnansweredInMs, new AskQuestionAction(session));
      }
    });
  }
}

class AskQuestionAction extends Action {
  constructor(session) {
    super(session);
    this.canBeSaved = true;
  }

  tryAcceptUserInput(userId, userName, input) {
    if (!this.readyForAnswers_) {
      return false;
    }
    let session = this.getSession_();
    const card = session.getCurrentCard();
    const oneAnswerPerPlayer = session.oneAnswerPerPlayer() || card.options;
    if (oneAnswerPerPlayer && session.answerAttempters.indexOf(userId) !== -1) {
      return false;
    }

    let timeLeft = card.answerTimeLimitInMs;
    if (this.timeoutStartTime) {
      timeLeft -= (new Date() - this.timeoutStartTime);
    }

    const inputAsInt = parseInt(input.replace(/\|\|/g, ''));
    if (!card.options || card.options.indexOf(input) !== -1 || (!Number.isNaN(inputAsInt) && inputAsInt <= card.options.length)) {
      if (!Number.isNaN(inputAsInt) && card.options) {
        input = `${inputAsInt}`;
      }
      session.answerAttempters.push(userId);
      if (session.getOwnerId() === userId && oneAnswerPerPlayer) {
        const accepted = session.tryAcceptAnswer(userId, userName, input);
        this.fulfill_(new ShowAnswersAction(session, timeLeft));
        return accepted;
      }
    }
    let accepted = session.tryAcceptAnswer(userId, userName, input);
    if (accepted) {
      this.fulfill_(new ShowAnswersAction(session, timeLeft));
    }
    return accepted;
  }

  scheduleReveal_(numberOfReveals) {
    if (numberOfReveals === 0) {
      return;
    }

    let session = this.getSession_();
    let timer = setTimeout(() => {
      try {
        cardStrategies.createTextQuestionWithHint(session.getCurrentCard(), session).then(question => {
          if (question) {
            return session.getMessageSender().showQuestion(question, this.shownQuestionId_).catch(err => {
              globals.logger.logFailure(LOGGER_TITLE, 'Failed to update reveal.', err);
            });
          }
        }).then(() => {
          this.scheduleReveal_(numberOfReveals - 1);
        }).catch(err => {
          this.reject_(err);
        });
      } catch(err) {
        this.reject_(err);
      }
    }, REVEAL_INTERVAL_IN_MS);
    session.addTimer(timer);
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }

  skip() {
    try {
      if (this.fulfill_) {
        let session = this.getSession_();
        session.markCurrentCardUnanswered();
        this.fulfill_(new ShowWrongAnswerAction(session, true));
      }
    } catch (err) {
      globals.logger.logFailure(LOGGER_TITLE, 'Failed to skip', err);
    }
  }

  async do() {
    let session = this.getSession_();
    session.answerAttempters = [];
    session.getScores().resetStateForNewCard();
    let nextCard = await session.getNextCard();
    if (!nextCard) {
      return Promise.resolve(new EndQuizNoQuestionsLeftAction(session));
    }

    let preprocessPromise = Promise.resolve(nextCard);
    if (!nextCard.wasPreprocessed) {
      preprocessPromise = nextCard.preprocess(nextCard);
    }

    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      this.reject_ = reject;
      preprocessPromise.then(card => {
        if (card === false) {
          nextCard.discarded = true;
          return fulfill(this.do());
        }
        card.wasPreprocessed = true;
        session.setCurrentCard(card);
        this.readyForAnswers_ = true;
        return card.createQuestion(card, session).then(question => {
          return retryPromise(() => Promise.resolve(session.getMessageSender().showQuestion(question)), 3).catch(err => {
            globals.logger.logFailure(LOGGER_TITLE, `Error showing question ${JSON.stringify(question)}`, err);
            throw err;
          });
        }).then(shownQuestionId => {
          this.shownQuestionId_ = shownQuestionId;
          this.timeoutStartTime = new Date();
          let timer = setTimeout(() => {
            try {
              session.markCurrentCardUnanswered();
              fulfill(new ShowWrongAnswerAction(session, false));
            } catch(err) {
              reject(err);
            }
          }, card.answerTimeLimitInMs);
          session.addTimer(timer);
          this.scheduleReveal_(card.numberOfReveals);
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    });
  }
}

class StartAction extends Action {
  do() {
    const session = this.getSession_();
    const name = session.getQuizName();
    const description = session.getQuizDescription();
    const quizLength = session.getRemainingCardCount();
    const scoreLimit = session.getScores().getScoreLimit();
    return Promise.resolve(session.getMessageSender().notifyStarting(INITIAL_DELAY_IN_MS, name, description, quizLength, scoreLimit)).catch(err => {
      globals.logger.logFailure(LOGGER_TITLE, 'Error showing quiz starting message', err);
    }).then(() => {
      let askQuestionAction = new AskQuestionAction(session);
      return new WaitAction(session, INITIAL_DELAY_IN_MS, askQuestionAction);
    });
  }
}

class WaitAction extends Action {
  constructor(session, waitInterval, nextAction) {
    super(session);
    this.waitInterval_ = waitInterval;
    this.nextAction_ = nextAction;
  }

  do() {
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      let timer = setTimeout(() => {
        fulfill(this.nextAction_);
      }, this.waitInterval_);
      this.getSession_().addTimer(timer);
    });
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }
}

class SaveAction extends Action {
  constructor(session, savingUserId) {
    super(session);
    this.savingUserId_ = savingUserId;
  }

  do() {
    let session = this.getSession_();
    return Promise.resolve(closeSession(session, false)).then(() => {
      let saveData = session.createSaveData();
      return saveManager.save(saveData, this.savingUserId_, session.getName(), session.getGameModeIdentifier());
    }).then(() => {
      return session.getMessageSender().notifySaveSuccessful().catch(err => {
        globals.logger.logFailure(LOGGER_TITLE, 'Error sending quiz save message', err);
      });
    }).catch(err => {
      globals.logger.logFailure(LOGGER_TITLE, 'Error saving', err);
      return new EndQuizForErrorAction(session);
    });
  }
}

function chainActions(locationId, action) {
  let session = state.quizManager.sessionForLocationId[locationId];
  if (!action || !action.do || !session) {
    return Promise.resolve();
  }
  state.quizManager.currentActionForLocationId[locationId] = action;

  try {
    return Promise.resolve(action.do()).then(result => {
      if (session.saveRequestedByUserId && result && result.canBeSaved) {
        return chainActions(locationId, new SaveAction(session, session.saveRequestedByUserId));
      }

      session.clearTimers();
      return chainActions(locationId, result);
    }).catch(err => {
      globals.logger.logFailure(LOGGER_TITLE, 'Error', err);
      return chainActions(locationId, new EndQuizForErrorAction(session)).then(() => {
        return QUIZ_END_STATUS_ERROR;
      });
    });
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Error in chainActions. Closing the session.', err);
    let messageSender = session.getMessageSender();
    return Promise.resolve(endQuiz(session, messageSender, messageSender.notifyQuizEndedError)).then(() => {
      return QUIZ_END_STATUS_ERROR;
    });
  }
}

/* EXPORT */

function verifySessionNotInProgress(locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already a session in progress there.');
}

class QuizManager {
  startSession(locationId, session, messageSender) {
    verifySessionNotInProgress(locationId);
    setSessionForLocationId(session, locationId);
    setMessageSenderForLocationId(messageSender, locationId);
    return chainActions(locationId, new StartAction(session));
  }

  isSessionInProgressAtLocation(locationId) {
    return isSessionInProgressAtLocation(locationId);
  }

  processUserInput(locationId, userId, userName, input) {
    input = input.toLowerCase();
    let currentAction = state.quizManager.currentActionForLocationId[locationId];
    if (!currentAction) {
      return false;
    }
    if (currentAction.tryAcceptUserInput) {
      return currentAction.tryAcceptUserInput(userId, userName, input);
    }
    return false;
  }

  stopAllQuizzes() {
    return stopAllQuizzesCommand();
  }

  stopQuiz(locationId, cancelingUserId, cancelingUserIsAdmin) {
    return stopQuizCommand(locationId, cancelingUserId, cancelingUserIsAdmin);
  }

  saveQuiz(locationId, savingUserId) {
    return saveQuizCommand(locationId, savingUserId);
  }

  skip(locationId) {
    return skipCommand(locationId);
  }

  getDesiredSettings() {
    return [
      'quiz/japanese/answer_time_limit',
      'quiz/japanese/score_limit',
      'quiz/japanese/unanswered_question_limit',
      'quiz/japanese/new_question_delay_after_unanswered',
      'quiz/japanese/new_question_delay_after_answered',
      'quiz/japanese/additional_answer_wait_time',
      'quiz_font_color',
      'quiz_background_color',
      'quiz_font_size',
      'quiz_font',
    ];
  }

  hasQuizSession(locationId) {
    return !!state.quizManager.currentActionForLocationId[locationId];
  }

  getInProcessLocations() {
    return Object.keys(state.quizManager.sessionForLocationId);
  }
}

module.exports = new QuizManager();
module.exports.END_STATUS_ERROR = QUIZ_END_STATUS_ERROR;
