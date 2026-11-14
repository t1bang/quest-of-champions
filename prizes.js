// Prize wall and wardrobe. cost = tokens. Used by both the site and the server.
// real:true items are real life items: the player gets a claim code by email.
// file: prizes are song downloads that unlock in the player's closet.
export const REAL_PRIZES_LIVE = true;

// AVATAR ITEMS: what a player's avatar can wear. slot = where it goes; cost 0 = free for everyone.
// Jewelry is priced higher (100+). The server only lets a player wear free items or ones in their closet.
export const SLOTS = [['hat', 'AVATAR HATS'], ['shirt', 'AVATAR SHIRTS'], ['pants', 'AVATAR PANTS'], ['shoes', 'AVATAR SHOES'], ['eyes', 'AVATAR EYEWEAR'],
  ['chain', 'GOLD CHAIN'], ['rings', 'GOLD RINGS'], ['fangs', 'GOLD FANGS'], ['belt', 'CHAMPIONSHIP BELT'], ['hand', 'IN YOUR HAND']];
export const JEWELRY = ['chain', 'rings', 'fangs', 'belt'];
export const WEAR = [
  // free basics
  ...[['red', '#e01226'], ['black', '#16161c'], ['white', '#ffffff'], ['blue', '#3ea8ff'], ['green', '#35e06f'], ['gold', '#ffc93a'], ['purple', '#b06cff'], ['orange', '#ff7a1a']]
    .map(([n, c]) => ({ id: 'tee-' + n, name: n[0].toUpperCase() + n.slice(1) + ' Tee', slot: 'shirt', cost: 0, icon: '👕', c })),
  { id: 'jeans-black', name: 'Black Jeans', slot: 'pants', cost: 0, icon: '👖', c: '#23232b' },
  { id: 'jeans-blue', name: 'Blue Jeans', slot: 'pants', cost: 0, icon: '👖', c: '#2a4a9a' },
  { id: 'shorts-grey', name: 'Grey Shorts', slot: 'pants', cost: 0, icon: '🩳', c: '#8a8f9c' },
  { id: 'kicks', name: 'White Sneakers', slot: 'shoes', cost: 0, icon: '👟', c: '#ffffff' },
  { id: 'kicks-black', name: 'Black Sneakers', slot: 'shoes', cost: 0, icon: '👟', c: '#16161c' },
  // hats
  { id: 'beanie', name: 'Black Beanie', slot: 'hat', cost: 25, icon: '🧢' },
  { id: 'cap', name: 'Red Snapback', slot: 'hat', cost: 30, icon: '🧢' },
  { id: 'crown', name: 'Arcade Crown', slot: 'hat', cost: 250, icon: '👑' },
  // shirts
  { id: 'hoodie', name: 'T1 Red Hoodie', slot: 'shirt', cost: 40, icon: '🧥' },
  { id: 'jersey', name: 'T1 Jersey', slot: 'shirt', cost: 50, icon: '🎽' },
  { id: 'suit', name: 'Black Suit', slot: 'shirt', cost: 80, icon: '🤵' },
  // pants
  { id: 'pants-camo', name: 'Camo Cargos', slot: 'pants', cost: 30, icon: '👖' },
  { id: 'pants-red', name: 'Red Track Pants', slot: 'pants', cost: 30, icon: '👖' },
  // shoes + eyewear
  { id: 'boots', name: 'Champion Boots', slot: 'shoes', cost: 50, icon: '🥾' },
  { id: 'shades', name: 'Red Aviators', slot: 'eyes', cost: 30, icon: '🕶️' },
  // jewelry
  { id: 'chain', name: 'Gold Chain', slot: 'chain', cost: 100, icon: '📿' },
  { id: 'fangs', name: 'Gold Fangs', slot: 'fangs', cost: 100, icon: '🦷' },
  { id: 'ring', name: 'Gold Rings', slot: 'rings', cost: 120, icon: '💍' },
  { id: 'belt', name: 'Championship Belt', slot: 'belt', cost: 160, icon: '🏆' },
  // in hand
  { id: 'mic', name: 'Gold Mic', slot: 'hand', cost: 60, icon: '🎤' },
  { id: 'record', name: 'Golden Record', slot: 'hand', cost: 80, icon: '📀' },
];
// MOVES: what an avatar can do in the lobby. Punch, kick, jump, combo and blast are free for everyone.
// Special moves are bought once and then equipped (one at a time); upgrades make every move stronger or faster.
export const MOVES = [
  { id: 'move-uppercut', name: 'Rising Uppercut', slot: 'move', cost: 60, icon: '⤴️', about: 'Launch up with a heavy fist' },
  { id: 'move-tornado', name: 'Tornado Kick', slot: 'move', cost: 80, icon: '🌪️', about: 'Spin and hit everything around you' },
  { id: 'move-dash', name: 'Flash Dash', slot: 'move', cost: 90, icon: '⚡', about: 'Blink forward and strike' },
  { id: 'move-slam', name: 'Ground Slam', slot: 'move', cost: 100, icon: '💥', about: 'Leap and send out a shockwave' },
  { id: 'move-wave', name: 'Big Bang Wave', slot: 'move', cost: 150, icon: '🌊', about: 'Charge up, then fire a long energy beam' },
  { id: 'move-meteor', name: 'Meteor Blast', slot: 'move', cost: 200, icon: '☄️', about: 'Lob a giant fireball that bursts where it lands' },
];
export const UPGRADES = [
  { id: 'up-power-2', name: 'Power Level 2', slot: 'upgrade', cost: 75, icon: '💪', about: 'All hits +40%' },
  { id: 'up-power-3', name: 'Power Level 3', slot: 'upgrade', cost: 150, icon: '💪', needs: 'up-power-2', about: 'All hits +80%' },
  { id: 'up-speed-2', name: 'Speed Level 2', slot: 'upgrade', cost: 75, icon: '⏱️', about: 'Moves recharge 25% faster' },
  { id: 'up-speed-3', name: 'Speed Level 3', slot: 'upgrade', cost: 150, icon: '⏱️', needs: 'up-speed-2', about: 'Moves recharge 45% faster' },
  { id: 'up-blast-2', name: 'Blast Level 2', slot: 'upgrade', cost: 75, icon: '🔆', about: 'Bigger blasts' },
  { id: 'up-blast-3', name: 'Blast Level 3', slot: 'upgrade', cost: 150, icon: '🔆', needs: 'up-blast-2', about: 'Huge blasts' },
];
export const DEFAULT_FIT = { shirt: 'tee-red', pants: 'jeans-black', shoes: 'kicks' };

// Everything that costs tokens: avatar items, real life items (500-2000 tokens) and song downloads.
export const PRIZES = [
  ...WEAR.filter(w => w.cost > 0),
  ...MOVES, ...UPGRADES,
  // real life items
  { id: 'real-tickets', name: 'Stevie Stone GOAT Talk Tour Tickets', icon: '🎟️', cost: 500, real: true, kind: 'ticket' },
  { id: 'real-stickers', name: 'Sticker Pack', icon: '🏷️', cost: 500, real: true },
  { id: 'real-tone-tee', name: 'Tone Da Boss T-Shirt', icon: '👕', cost: 500, real: true },
  { id: 'real-hat', name: 'T1 Hat', icon: '🧢', cost: 750, real: true },
  { id: 'real-hoodie', name: 'T1 Hoodie', icon: '🧥', cost: 1000, real: true },
  // song downloads (10 tokens each)
  { id: 'song-ring', name: 'Gimme My Ring', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/ring.mp3' },
  { id: 'song-champions', name: 'Champions', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/champions.mp3' },
  { id: 'song-victory', name: 'Victory Lap', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/victory.mp3' },
  { id: 'song-showtime', name: 'Showtime', icon: '🎵', cost: 10, file: 'games/quest-of-champions/audio/showtime.mp3' },
];

// Token rewards (the server enforces these).
// minute = each minute a game window is open; fatality = T1 Versus; level = beating a Quest of Champions level;
// social = one-time bonus for signing in with Google or Facebook.
// signup = one-time bonus when a player signs in (links an account); daily = 10 x the streak day, up to streakMax days (70 a day).
export const REWARDS = { signup: 25, daily: 10, streakMax: 7, play: 0, trailer: 3, song: 1, scorePer100: 1, scoreMax: 50, minute: 1, fatality: 3, level: 5, social: 5 };

// The bar in the lounge.
export const BAR = { beer: 5, tips: [1, 2, 5], play: 1 }; // play = tokens to start a game

// Tokens for real money (PayPal). cents is the price in US cents.
export const TOKEN_PACK = { tokens: 100, cents: 500 };
