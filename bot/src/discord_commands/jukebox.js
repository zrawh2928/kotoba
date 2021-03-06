
const { PublicError } = require('monochrome-bot');

const YoutubeApi = require('./../common/youtube_api_utils.js');
const retryPromise = require('./../common/util/retry_promise.js');

const PLAYLIST_ID = 'PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ';

let videoUris = [];

module.exports = {
  commandAliases: ['jukebox'],
  canBeChannelRestricted: true,
  uniqueId: 'jukebox409453',
  cooldown: 5,
  shortDescription: 'I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link.',
  longDescription: 'I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link. Songs are chosen from this playlist: https://www.youtube.com/watch?v=iyL_SXBlNIk&list=PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ. There are about 800 songs.',
  async initialize(monochrome) {
    const logger = monochrome.getLogger();

    if (YoutubeApi.hasApiKey()) {
      try {
        const links = await retryPromise(() => YoutubeApi.getAllLinksInPlaylist(PLAYLIST_ID), 5);
        videoUris = links;
        logger.logSuccess('YOUTUBE', 'Track URIs loaded');
      } catch (err) {
        logger.logFailure('YOUTUBE', 'Failed to load playlist.', err);
      }
    }
  },
  action(bot, msg, suffix, monochrome) {
    const logger = monochrome.getLogger();

    if (videoUris.length === 0) {
      throw PublicError.createWithCustomPublicMessage('No tracks available. Maybe they just have not loaded yet. Try again soon.', true, 'Tracks not available');
    }

    const random = Math.floor(Math.random() * videoUris.length);
    const link = videoUris[random];

    logger.logSuccess('YOUTUBE', `Sending link: ${link}`);
    return msg.channel.createMessage(link, null, msg);
  },
};
