[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba
A Discord bot for helping with language learning (especially Japanese)

Node 6.9.1+ recommended.

Runs on [monochrome bot framework](https://github.com/mistval/monochrome)

## Help Wanted

I'd love to get help from other developers, and there is plenty to do. If you're interested, let me know.

## Installation
```
git clone https://github.com/mistval/kotoba.git
cd kotoba
npm install -S --no-optional
npm run build
```

## Configuration
For the bot to run, you must add your bot token to config.json.

Optionally, add API keys to kotoba/api_keys.js. Some commands require API keys to work.

## Starting the bot
```
node ./monochrome.js
```
The bot should now be online. Invite it to your server and say k!help to see commands.

## Commands

```glsl
k!j
    # Search Jisho for an English or Japanese word. Example: k!j 少し
k!kanji (aliases: k!k)
    # Search for information about a kanji. Example: k!kanji 少
k!shiritori (aliases: k!st, k!sh)
    # Start a game of shiritori in this channel.
k!strokeorder (aliases: k!so)
    # Search for details about a kanji's strokes. Example: k!strokeorder 少
k!kotobank (aliases: k!ko)
    # (Experimental) Search Kotobank for a Japanese word.
k!furigana (aliases: k!furi, k!f)
    # Render furigana for Japanese text. Example: k!furigana 吾輩は猫である
k!quiz (aliases: k!q)
    # See how to start a quiz in this channel.
k!examples (aliases: k!ex)
    # Search Jisho for example sentences. Example: k!examples 少し
k!pronounce (aliases: k!p)
    # Look up information about how to pronounce a Japanese word. Example: k!pronounce 瞬間
k!random (aliases: k!r)
    # Search Jisho for a random word. You can specify a JLPT or 漢検 level if you want. Example: 'k!random N3', 'k!random 2k'
k!deconjugate (aliases: k!d)
    # Deconjugate a Japanese verb. Example: k!deconjugate 食べさせられたかった
k!translate (aliases: k!t)
    # Use Google Translate to translate text. Example: k!translate 吾輩は猫である
k!weblio (aliases: k!w)
    # Search the Weblio Japanese dictionary for a word or phrase. Example: k!weblio 少し
k!jukebox
    # I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link.
k!invite
    # Get a link to invite me to your server.
k!about
    # Show some meta information about me.
k!settings (aliases: k!s)
    # Server admins can use this command to see and configure my settings on their server.

Say k!help [command name] to see more help for a command. Example: k!help k!j
```

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a few things that aren't here.

## Help

[Support](https://discord.gg/f4Gkqku)
