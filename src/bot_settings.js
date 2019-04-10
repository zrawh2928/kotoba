const reload = require('require-reload')(require);
const { SettingsConverters, SettingsValidators } = require('monochrome-bot');

const fontHelper = reload('./common/font_helper.js');
const shiritoriForeverHelper = require('./discord/shiritori_forever_helper.js');

function isInRange(min, max, value) {
  return value >= min && value <= max;
}

function validateRGBColor(input) {
  const MIN = 0;
  const MAX = 255;

  const regex = /rgb\(([0-9]{1,3}),[ ]{0,}([0-9]{1,3}),[ ]{0,}([0-9]{1,3})\)/i;
  const regexResult = regex.exec(input);

  if (!regexResult) {
    return false;
  }

  const r = parseInt(regexResult[1], 10);
  const g = parseInt(regexResult[2], 10);
  const b = parseInt(regexResult[3], 10);

  return isInRange(MIN, MAX, r) && isInRange(MIN, MAX, g) && isInRange(MIN, MAX, b);
}

function validateRGBAColor(input) {
  const RGB_MIN = 0;
  const RGB_MAX = 255;
  const A_MIN = 0;
  const A_MAX = 1;

  const regex = /rgba\(([0-9]{1,3}),[ ]{0,}([0-9]{1,3}),[ ]{0,}([0-9]{1,3}),[ ]{0,}([0-9]*\.[0-9]+|[0-9]+)\)/i;
  const regexResult = regex.exec(input);

  if (!regexResult) {
    return false;
  }

  const r = parseInt(regexResult[1], 10);
  const g = parseInt(regexResult[2], 10);
  const b = parseInt(regexResult[3], 10);
  const a = parseFloat(regexResult[4], 10);

  return isInRange(RGB_MIN, RGB_MAX, r)
    && isInRange(RGB_MIN, RGB_MAX, g)
    && isInRange(RGB_MIN, RGB_MAX, b)
    && isInRange(A_MIN, A_MAX, a);
}

function validateRGBorRGBA(input) {
  return validateRGBColor(input) || validateRGBAColor(input);
}

function onShiritoriForeverEnabledChanged(treeNode, channelID, newSettingValidationResult) {
  return shiritoriForeverHelper.handleEnabledChanged(
    channelID,
    newSettingValidationResult.newInternalValue,
  );
}

const fontForIndex = {};
fontHelper.availableFontSettings.forEach((key, index) => {
  fontForIndex[index + 1] = key;
});

const fontDescriptionList = Object.keys(fontForIndex)
  .map(index => `${index}. **${fontForIndex[index]}** - ${fontHelper.descriptionForFontSetting[fontForIndex[index]]}`)
  .join('\n');

const fontForFont = {};
fontHelper.availableFontSettings.forEach((key) => {
  fontForFont[key.toLowerCase()] = key;
});

const fontForInput = {
  ...fontForIndex,
  ...fontForFont,
};

const availableFontsAllowedValuesString = `Enter the number of the font you want from below.\n\n${fontDescriptionList}\n\nNote that some fonts support more kanji than others. You may see me fall back to a different font for kanji that isn't supported by your chosen font.`;

module.exports = [
  {
    userFacingName: 'Quiz',
    description: 'You can change the settings for quiz decks here. Each quiz deck belongs to one of the settings groups below, and to "All decks". To find out what settings group a deck belongs to, you can say **<prefix>quiz info deckname**, for example **<prefix>quiz info n1**. To change the settings for a settings group, type the number shown below for that settings group.',
    children:
    [
      {
        userFacingName: 'All decks',
        children: [
          {
            userFacingName: 'Unanswered question limit',
            description: 'This setting controls how many questions in a row are allowed to go unanswered before the game stops. The intended purpose for this is to automatically end games that players abandon.',
            allowedValuesDescription: 'A whole number between 1 and 25',
            uniqueId: 'quiz/japanese/unanswered_question_limit',
            userSetting: false,
            defaultUserFacingValue: '5',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 25),
          },
          {
            userFacingName: 'Delay after answered question',
            description: 'This setting controls how long I will wait (in seconds) after an answer is correctly answered and the window for additional answers closes, before I show a new question. For example, if **Additional answer wait window** is set to two, and this setting is set to three, then after a question is answered correctly a total of five seconds will pass before I ask a new one.',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/japanese/new_question_delay_after_answered',
            defaultUserFacingValue: '2.5',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
          {
            userFacingName: 'Delay after unanswered question',
            description: 'This setting controls how long I will wait (in seconds) after a timed out question before showing a new one. By setting this higher, players get more time to view and consider the correct answer.',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/japanese/new_question_delay_after_unanswered',
            defaultUserFacingValue: '3.75',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
        ],
      },
      {
        userFacingName: 'Kanji reading decks',
        children: [
          {
            userFacingName: 'Answer time limit',
            description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
            allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
            uniqueId: 'quiz/kanji_reading/answer_time_limit',
            defaultUserFacingValue: '16',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
          },
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/kanji_reading/score_limit',
            defaultUserFacingValue: '10',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Additional answer wait window',
            description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/kanji_reading/additional_answer_wait_time',
            defaultUserFacingValue: '2.15',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
        ],
      },
      {
        userFacingName: 'Grammar decks',
        children: [
          {
            userFacingName: 'Answer time limit',
            description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
            allowedValuesDescription: 'A number between 15 and 120 (in seconds)',
            uniqueId: 'quiz/grammar/answer_time_limit',
            defaultUserFacingValue: '50',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(15, 120),
          },
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/grammar/score_limit',
            defaultUserFacingValue: '5',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Additional answer wait window',
            description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/grammar/additional_answer_wait_time',
            defaultUserFacingValue: '2.15',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
        ],
      },
      {
        userFacingName: 'Kanji usage decks',
        children: [
          {
            userFacingName: 'Base answer time limit',
            description: 'This setting controls how many seconds players have to give the first correct answer to the question before I say time\'s up and move on to the next question. When a correct answer is given, the time limit is extended to X seconds after the current time. You can set X by setting the **Time limit after correct answer** setting.',
            allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
            uniqueId: 'quiz/kanji_usage/base_answer_time_limit',
            defaultUserFacingValue: '16',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
          },
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/kanji_usage/score_limit',
            defaultUserFacingValue: '300',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Time limit after correct answer',
            description: 'After a question is correctly answered, the answer time limit will be set to the current time plus this many seconds.',
            allowedValuesDescription: 'A number between 0 and 30',
            uniqueId: 'quiz/kanji_usage/time_limit_after_correct_answer',
            defaultUserFacingValue: '6',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 30),
          },
        ],
      },
      {
        userFacingName: 'Listening comprehension decks',
        children: [
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/listening_comprehension/score_limit',
            defaultUserFacingValue: '5',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Additional answer wait window',
            description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/listening_comprehension/additional_answer_wait_time',
            defaultUserFacingValue: '2.15',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
          {
            userFacingName: 'Answer time limit after audio ends',
            description: 'This setting controls how much longer you have to answer the question (in seconds) after the audio ends.',
            allowedValuesDescription: 'A whole number between 0 and 30',
            uniqueId: 'quiz/listening_comprehension/time_limit_after_audio_ends',
            defaultUserFacingValue: '7.5',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 30),
          },
        ],
      },
      {
        userFacingName: 'Listening vocabulary decks',
        children: [

        ],
      },
      {
        userFacingName: 'Sentence typing decks',
        children: [
          {
            userFacingName: 'Answer time limit',
            description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
            allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
            uniqueId: 'quiz/sentence_typing/answer_time_limit',
            defaultUserFacingValue: '30',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
          },
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/sentence_typing/score_limit',
            defaultUserFacingValue: '10',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Additional answer wait window',
            description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/sentence_typing/additional_answer_wait_time',
            defaultUserFacingValue: '2.15',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
        ],
      },
      {
        userFacingName: 'Anagrams decks',
        children: [
          {
            userFacingName: 'Base answer time limit',
            description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
            allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
            uniqueId: 'quiz/anagrams/base_answer_time_limit',
            defaultUserFacingValue: '12',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
          },
          {
            userFacingName: 'Extra time per character',
            description: 'You can use this setting to add more time to the question based on how many characters are in the question. For example if **Base answer time limit** is 12 and **Extra time per character** is 2, then you will have 20 seconds to answer anagrams length 4 questions (12 + 2*4).',
            allowedValuesDescription: 'A number between 0 and 10 (in seconds)',
            uniqueId: 'quiz/anagrams/extra_time_per_character',
            defaultUserFacingValue: '2',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 10),
          },
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/anagrams/score_limit',
            defaultUserFacingValue: '10',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Additional answer wait window',
            description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/anagrams/additional_answer_wait_time',
            defaultUserFacingValue: '2.15',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
        ],
      },
      {
        userFacingName: 'English definitions decks',
        children: [

        ],
      },
      {
        userFacingName: 'Onomatopoeia decks',
        children: [

        ],
      },
      {
        userFacingName: 'Japanese definitions decks',
        children: [

        ],
      },
      {
        userFacingName: 'Japanese trivia decks',
        children: [

        ],
      },
      {
        userFacingName: 'Translation decks',
        children: [

        ],
      },
      {
        userFacingName: 'Image decks',
        children: [
          {
            userFacingName: 'Answer time limit',
            description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
            allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
            uniqueId: 'quiz/image/answer_time_limit',
            defaultUserFacingValue: '16',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
          },
          {
            userFacingName: 'Score limit',
            description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
            allowedValuesDescription: 'A whole number between 1 and 10000',
            uniqueId: 'quiz/image/score_limit',
            defaultUserFacingValue: '10',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
          },
          {
            userFacingName: 'Additional answer wait window',
            description: 'After a question is correctly answered, other players have a chance to also answer the question and get a point. This setting controls how long they have (in seconds).',
            allowedValuesDescription: 'A number between 0 and 120',
            uniqueId: 'quiz/image/additional_answer_wait_time',
            defaultUserFacingValue: '2.15',
            convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
            convertInternalValueToUserFacingValue: SettingsConverters.toString,
            validateInternalValue: SettingsValidators.createRangeValidator(0, 120),
          },
        ],
      },
      {
        userFacingName: 'Synonyms decks',
        children: [

        ],
      },
    ],
  },
  {
    userFacingName: 'Fonts',
    children:
    [
      {
        userFacingName: 'Quiz text font color',
        description: 'This setting controls the color of the text rendered for quizzes.',
        allowedValuesDescription: 'Figure out the red, blue, and green components of the color you want and enter a value like this: **rgb(100, 50, 10)** (that\'s red 100, green 50, and blue 10). You can use [a tool like this](https://www.w3schools.com/colors/colors_rgb.asp) to get the color you want. Play around with the sliders, and then copy the **rgb(x,y,z)** value that it shows you. Each color component must be a whole number between 0 and 255. (rgba works too)',
        uniqueId: 'quiz_font_color',
        defaultUserFacingValue: 'rgb(0, 0, 0)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateRGBorRGBA,
      },
      {
        userFacingName: 'Quiz text background color',
        description: 'This setting controls the background color of the text rendered for quizzes.',
        allowedValuesDescription: 'Figure out the red, blue, and green components of the color you want and enter a value like this: **rgb(100, 50, 10)** (that\'s red 100, green 50, and blue 10). You can use [a tool like this](https://www.w3schools.com/colors/colors_rgb.asp) to get the color you want. Play around with the sliders, and then copy the **rgb(x,y,z)** value that it shows you. Each color component must be a whole number between 0 and 255. (rgba works too)',
        uniqueId: 'quiz_background_color',
        defaultUserFacingValue: 'rgb(255, 255, 255)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateRGBorRGBA,
      },
      {
        userFacingName: 'Quiz text font size',
        description: 'This setting controls the font size of the text rendered for quizzes.',
        allowedValuesDescription: 'A number between 20 and 200 (in font size points)',
        uniqueId: 'quiz_font_size',
        defaultUserFacingValue: '106',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(20, 200),
      },
      {
        userFacingName: 'Quiz font',
        description: 'This setting controls the font used for text rendered for quizzes.',
        allowedValuesDescription: availableFontsAllowedValuesString,
        uniqueId: 'quiz_font',
        defaultUserFacingValue: 'Yu Mincho',
        convertUserFacingValueToInternalValue: SettingsConverters.createMapConverter(
          fontForInput,
          true,
        ),
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.isMappable,
      },
      {
        userFacingName: 'Furigana font color',
        description: 'This setting controls the color of the text produced by the furigana command.',
        allowedValuesDescription: 'Figure out the red, blue, and green components of the color you want and enter a value like this: **rgb(100, 50, 10)** (that\'s red 100, green 50, and blue 10). You can use [a tool like this](https://www.w3schools.com/colors/colors_rgb.asp) to get the color you want. Play around with the sliders, and then copy the **rgb(x,y,z)** value that it shows you. Each color component must be a whole number between 0 and 255. (rgba works too)',
        uniqueId: 'furigana_font_color',
        defaultUserFacingValue: 'rgb(192, 193, 194)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateRGBorRGBA,
      },
      {
        userFacingName: 'Furigana background color',
        description: 'This setting controls the background color of the text produced by the furigana command.',
        allowedValuesDescription: 'Figure out the red, blue, and green components of the color you want and enter a value like this: **rgb(100, 50, 10)** (that\'s red 100, green 50, and blue 10). You can use [a tool like this](https://www.w3schools.com/colors/colors_rgb.asp) to get the color you want. Play around with the sliders, and then copy the **rgb(x,y,z)** value that it shows you. Each color component must be a whole number between 0 and 255. (rgba works too)',
        uniqueId: 'furigana_background_color',
        defaultUserFacingValue: 'rgb(54, 57, 62)',
        convertUserFacingValueToInternalValue: SettingsConverters.toString,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: validateRGBorRGBA,
      },
      {
        userFacingName: 'Furigana font size',
        description: 'This setting controls the font size of the main text of the furigana command. The size of the furigana text (above the main text) is this value divided by two.',
        allowedValuesDescription: 'A number between 10 and 80 (in font size points)',
        uniqueId: 'furigana_main_font_size',
        defaultUserFacingValue: '40',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(20, 80),
      },
      {
        userFacingName: 'Furigana font',
        description: 'This setting controls the font used for the furigana command.',
        allowedValuesDescription: availableFontsAllowedValuesString,
        uniqueId: 'furigana_font',
        defaultUserFacingValue: 'Yu Mincho',
        convertUserFacingValueToInternalValue: SettingsConverters.createMapConverter(
          fontForInput,
          true,
        ),
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.isMappable,
      },
    ],
  },
  {
    userFacingName: 'Dictionary',
    children:
    [
      {
        userFacingName: 'Display mode',
        description: 'This setting controls the default display mode for dictionary results. **big** shows multiple pages and multiple results per page. **small** only shows one result with up to three definitions.',
        allowedValuesDescription: 'Either **Big** or **Small**',
        uniqueId: 'dictionary/display_mode',
        serverOnly: false,
        defaultUserFacingValue: 'Big',
        convertUserFacingValueToInternalValue: SettingsConverters.toStringLowercase,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createDiscreteOptionValidator(['big', 'small']),
      },
    ],
  },
  {
    userFacingName: 'Shiritori',
    children:
    [
      {
        userFacingName: 'Bot score multiplier',
        description: 'The bot\'s score is multiplied by this number to handicap it.',
        allowedValuesDescription: 'A number between 0 and 1',
        uniqueId: 'shiritori/bot_score_multiplier',
        serverOnly: false,
        defaultUserFacingValue: '.7',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(0, 1),
      },
      {
        userFacingName: 'Bot turn minimum wait',
        description: 'This setting controls the minimum amount of time (in seconds) that the bot will wait before giving its answer.',
        allowedValuesDescription: 'A number between 1 and 30',
        uniqueId: 'shiritori/bot_turn_minimum_wait',
        serverOnly: false,
        defaultUserFacingValue: '3',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(1, 30),
      },
      {
        userFacingName: 'Bot turn maximum wait',
        description: 'This setting controls the maximum amount of time (in seconds) that the bot will wait before giving its answer.',
        allowedValuesDescription: 'A number between 1 and 30',
        uniqueId: 'shiritori/bot_turn_maximum_wait',
        serverOnly: false,
        defaultUserFacingValue: '6',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(1, 30),
      },
      {
        userFacingName: 'Answer time limit',
        description: 'This setting controls the amount of time (in seconds) that players have to give their answer. This does not apply to the bot player.',
        allowedValuesDescription: 'A number between 5 and 300',
        uniqueId: 'shiritori/answer_time_limit',
        serverOnly: false,
        defaultUserFacingValue: '40',
        convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
        convertInternalValueToUserFacingValue: SettingsConverters.toString,
        validateInternalValue: SettingsValidators.createRangeValidator(5, 300),
      },
    ],
  },
  {
    userFacingName: 'Shiritori Forever',
    children:
    [
      {
        userFacingName: 'Shiritori Forever enabled',
        description: 'Control whether Shiritori Forever is enabled, and where. After you change the setting, you will be asked where to apply it.',
        allowedValuesDescription: 'Either **enabled** or **disabled**',
        uniqueId: 'shiritoriforever',
        userSetting: false,
        serverSetting: false,
        defaultUserFacingValue: 'Disabled',
        convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
        convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
        validateInternalValue: SettingsValidators.isBoolean,
        onChannelSettingChanged: onShiritoriForeverEnabledChanged,
      },
    ],
  },
];
