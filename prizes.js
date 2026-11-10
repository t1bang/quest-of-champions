// Prize wall. cost = tokens. Used by both the site and the server.
// real:true prizes give the player a claim code to redeem with T1 Entertainment.
// file: prizes are song downloads that unlock in the player's closet.
export const REAL_PRIZES_LIVE = true;

export const PRIZES = [
  { id: 'beanie', name: 'Black Beanie', icon: '🧢', cost: 25 },
  { id: 'shades', name: 'Red Aviators', icon: '🕶️', cost: 30 },
  { id: 'hoodie', name: 'T1 Red Hoodie', icon: '🧥', cost: 40 },
  { id: 'boots', name: 'Champion Boots', icon: '🥾', cost: 50 },
  { id: 'mic', name: 'Gold Mic', icon: '🎤', cost: 60 },
  { id: 'record', name: 'Golden Record', icon: '📀', cost: 80 },
  { id: 'ring', name: 'Champion Ring', icon: '💍', cost: 120 },
  { id: 'belt', name: 'Title Belt', icon: '🏆', cost: 160 },
  { id: 'crown', name: 'Arcade Crown', icon: '👑', cost: 250 },
  // real prizes
  { id: 'real-stickers', name: 'Sticker Pack', icon: '🏷️', cost: 15, real: true },
  { id: 'real-tone-tee', name: 'Tone Da Boss T-Shirt', icon: '👕', cost: 40, real: true },
  { id: 'real-hat', name: 'T1 Hat', icon: '🧢', cost: 45, real: true },
  { id: 'real-stevie-tickets', name: 'Stevie Stone Tickets', icon: '🎟️', cost: 60, real: true },
  { id: 'real-hoodie', name: 'T1 Hoodie', icon: '🧥', cost: 80, real: true },
  // song downloads (10 tokens each)
  { id: 'song-ring', name: 'Gimme My Ring', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/ring.mp3' },
  { id: 'song-champions', name: 'Champions', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/champions.mp3' },
  { id: 'song-victory', name: 'Victory Lap', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/victory.mp3' },
  { id: 'song-showtime', name: 'Showtime', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/showtime.mp3' },
];

// Token rewards (the server enforces these).
// minute = each minute a game window is open; fatality = T1 Versus; level = beating a Quest of Champions level;
// social = one-time bonus for signing in with Google or Facebook.
export const REWARDS = { daily: 25, play: 5, trailer: 3, song: 1, scorePer100: 1, scoreMax: 50, minute: 1, fatality: 3, level: 5, social: 5 };
