// BIG BANG ARCADE — everything you may want to change lives in this file.
// Leave a value as '' and the site shows that slot as "coming soon".

// Where a cabinet stands: by default the main back wall (six slots), then the East Wing.
// Add  room: 'east'  to put a game in the East Wing, or  hallSlot: 0-3  to pin it to the hallway.
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
  { id: 'guerilla', title: 'Gorilla City 2032', genre: 'Open World', color: '#35e06f', trim: '#16a08e',
    blurb: 'The whole city is yours. Go anywhere, run everything.',
    play: 'https://gorillacity.bigbangarcade.com/', trailer: '',
    cab: 'assets/cabs/gorilla',
    art: 'assets/cabs/gorilla-cabinet.jpg',
    shots: ['assets/cabs/gorilla-screen.jpg', 'assets/cabs/gorilla-cabinet.jpg'] },
  { id: 'gamerboy', title: 'Gamer Boyz', genre: 'Adventure', color: '#3ea8ff',
    blurb: 'Tone Da Boss and Entre Luché run, jump and grab records in a handheld side-scroller synced to the song.',
    play: 'https://gamer-boyz.vercel.app', trailer: '',
    art: 'assets/gamerboyz-cover.jpg',
    shots: ['assets/gamerboyz-cover.jpg'] },
  { id: 'blankman', title: 'Blankman: The Game', genre: 'Beat ’em up', color: '#ffcf24', trim: '#ef2638', hallSlot: 2,
    blurb: 'A homemade hero. Eight comic-book stages, mob battles, gadgets, and a wild Blankmobile rail run. Keyboard, touch, and controller ready.',
    play: 'games/blankman/', trailer: '', cab: 'assets/cabs/blankman', frontArt: 'assets/cabs/blankman-front.jpg',
    art: 'assets/cabs/blankman-side.jpg',
    shots: ['assets/cabs/blankman-screen.jpg', 'assets/cabs/blankman-play.jpg', 'assets/cabs/blankman-cabinet.jpg'] },
  { id: 'cruizin', title: 'Cruizin IA', genre: 'Racing', color: '#ff7a1a', style: 'racer', hallSlot: 0,   // twin sit-down racer, in the hallway
    blurb: 'Cedar Rapids in 3D. Run the I-380 S-curve sprint, then take the exit and roam downtown on wheels, on foot or on a board. Keyboard on a computer, touch controls on a phone (turn it sideways).',
    play: 'https://cruizin.chucksi.com/', trailer: '',
    art: 'assets/cruizin-cover.jpg',
    shots: ['assets/cruizin-cover.jpg'] },
];

// Coming-soon games in the hallway. "file" = the song that plays when a player walks up
// (an MP3 address); "art" = the song artwork used as the cover for now.
export const SOON = [
  { hallSlot: 1, id: 'bslam', title: 'Basketball Slam', color: '#ffd23e', song: 'Slam', file: 'assets/audio/slam.mp3', art: 'assets/slam-cover.jpg' },
  { hallSlot: 3, id: 'toptier', title: 'Top Tier Wrestling', color: '#ff2a3c', song: 'Everything Top Tier, Everything Critical', file: '', art: '' },
  // East Wing machines. "style" picks the cabinet shape (see cabs.js): racer, golf, dance, pinball, claw.
  // The titles are working names: change them here and every sign updates.
  { room: 'east', style: 'golf', id: 'golf', title: 'Big Bang Golf', color: '#35e06f', song: '', file: '', art: '' },
  { room: 'east', style: 'dance', id: 'dance', title: 'T1 Dance Off', color: '#ff4fd8', song: '', file: '', art: '' },
  { room: 'east', style: 'pinball', id: 'pinball', title: 'Big Bang Pinball', color: '#b06cff', song: '', file: '', art: '' },
  { room: 'east', style: 'claw', id: 'claw', title: 'Prize Claw', color: '#ff4fd8', song: '', file: '', art: '' },
];

// Big Bang Vault videos. Paste each YouTube link; until then the button opens a YouTube search.
export const VAULT = [
  { title: 'Big Bang - Spongebob Ready', link: 'https://www.youtube.com/watch?v=1AdMNkB8_qo' },
  { title: 'Big Bang - Polo', link: 'https://www.youtube.com/watch?v=ihnmObSXUAY' },
  { title: 'Big Bang - Hustlin Everyday featuring Wiz Khalifa', link: 'https://www.youtube.com/watch?v=gQofUolJ0Xs' },
  { title: 'Big Bang - Holster featuring Young Buck', link: 'https://www.youtube.com/watch?v=88MDfkaVc2E' },
];

// Sign in with Google / Facebook (Supabase Auth). Turn the providers on in the Supabase project first.
export const SOCIAL_AUTH = { url: 'https://tdjvnhuygpobdcmhlcms.supabase.co', key: 'sb_publishable_hQBcSsJqxa9vLTCAwx2W-w_ZlZDVMxy' };

// Original ElevenLabs 8-bit lobby theme, take 1.
export const BGM = 'assets/audio/big-bang-elevenlabs-take-1.mp3';

// Jukebox playlist: paste the YouTube / YouTube Music playlist link here and the jukebox
// plays the real songs in a built-in player.
export const JUKEBOX_PLAYLIST = '';

// Jukebox. "yt" is the YouTube video id of each song; they play inside the arcade.
const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Tone Da Boss ' + q);
export const SONGS = [
  { title: 'Spongebob Ready', yt: '1AdMNkB8_qo' },
  { title: 'Polo', yt: 'ihnmObSXUAY' },
  { title: 'Iowa City', yt: '4LPmJ98cW1Y' },
  { title: 'Vodka Sam', yt: 'SkN7nG0uYos' },
  { title: 'Gimme My Ring', yt: 'begAKL1vLKQ' },
  { title: 'Champions', yt: 'aKII61tbGk4' },
  { title: 'Victory Lap', yt: '5ffjcVkjQiI' },
  { title: 'Showtime', yt: '_beib350hDc' },
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
