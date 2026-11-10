// BIG BANG ARCADE — everything you may want to change lives in this file.
// Leave a value as '' and the site shows that slot as "coming soon".

export const GAMES = [
  { id: 'quest', title: 'Quest of Champions', genre: 'Action', color: '#ff2a3c',
    blurb: 'Grab the mic, collect the records and fight your way to the ring. The main event.',
    play: 'games/quest-of-champions/',   // link to the playable build
    trailer: '',                         // YouTube link for the real trailer (the built-in one plays until then)
    art: 'assets/qoc-title.jpg', poster: 'assets/qoc-play.jpg',
    shots: ['assets/qoc-title.jpg', 'assets/qoc-play.jpg'] },
  { id: 'vendetta', title: 'T1 Versus', genre: 'Fighting', color: '#ffb400', trim: '#d2142a',
    blurb: '21 fighters, one on one. Settle the score, round after round.',
    play: 'https://t1game.chucksi.com', trailer: '',
    cab: 'assets/cabs/versus',           // cabinet art wrap: -marquee, -screen, -side, -panel, -base, -coin
    art: 'assets/cabs/versus-cabinet.jpg',
    shots: ['assets/cabs/versus-screen.jpg', 'assets/cabs/versus-cabinet.jpg'] },
  { id: 'guerilla', title: 'Guerilla City', genre: 'Open World', color: '#35e06f', trim: '#16a08e',
    blurb: 'The whole city is yours. Go anywhere, run everything.',
    play: '', trailer: '',
    cab: 'assets/cabs/gorilla',
    art: 'assets/cabs/gorilla-cabinet.jpg',
    shots: ['assets/cabs/gorilla-screen.jpg', 'assets/cabs/gorilla-cabinet.jpg'] },
  { id: 'gamerboy', title: 'Gamerboy', genre: 'Adventure', color: '#3ea8ff',
    blurb: 'Jump in the handheld and adventure through every level.',
    play: '', trailer: '' },
];

// Background music for the room (the 32-bit arcade version of Spongebob Ready).
export const BGM = 'assets/audio/spongebob-ready-32bit.mp3';

// Jukebox. "link" opens the song on a streaming site.
// Add "file" (an MP3 address) and the song plays inside the arcade instead.
const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Tone Da Boss ' + q);
export const SONGS = [
  { title: 'Spongebob Ready (32-Bit)', link: yt('Spongebob Ready'), file: BGM },
  { title: 'Polo', link: yt('Polo'), file: '' },
  { title: 'Iowa City', link: yt('Iowa City'), file: '' },
  { title: 'Vodka Sam', link: yt('Vodka Sam'), file: '' },
  { title: 'Gimme My Ring', link: yt('Gimme My Ring'), file: 'games/quest-of-champions/audio/ring.mp3' },
  { title: 'Champions', link: yt('Champions'), file: 'games/quest-of-champions/audio/champions.mp3' },
  { title: 'Victory Lap', link: yt('Victory Lap'), file: 'games/quest-of-champions/audio/victory.mp3' },
  { title: 'Showtime', link: yt('Showtime'), file: 'games/quest-of-champions/audio/showtime.mp3' },
];
export const MUSIC_PAGES = [
  ['Spotify', 'https://open.spotify.com/artist/0INF89wwzGt2GtRrUKrhii'],
  ['Apple Music', 'https://music.apple.com/us/artist/tone-da-boss/318112377'],
  ['SoundCloud', 'https://m.soundcloud.com/tonedaboss'],
];

// Donate buttons — paste the full link for each.
export const DONATE = [
  ['Cash App', ''],   // https://cash.app/$yourtag
  ['Apple Pay', ''],  // a payment link that accepts Apple Pay
  ['PayPal', ''],     // https://paypal.me/yourname
  ['Venmo', ''],      // https://venmo.com/u/yourname
];

export const SOCIALS = {
  'T1 Entertainment': [
    ['Instagram', ''], ['Facebook', ''], ['YouTube', ''], ['TikTok', ''], ['X', ''],
  ],
  'ChuckYouSuck': [
    ['Instagram', 'https://www.instagram.com/chuckyousuck'],
    ['Facebook', 'https://www.facebook.com/chuckyousuck'],
    ['YouTube', 'https://www.youtube.com/@chuckyousuck'],
    ['TikTok', 'https://www.tiktok.com/@chuckyousuck'],
    ['X', 'https://x.com/chuckyousuck'],
  ],
};

// How to claim a real prize (shown with the claim code).
export const CLAIM_HELP = 'Send this code to T1 Entertainment to claim your prize.';
