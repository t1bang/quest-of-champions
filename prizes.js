// Prize wall. cost = tokens. Used by both the site and the server.
// real:true prizes give the player a claim code instead of a closet-only item.
// They stay hidden until REAL_PRIZES_LIVE is true — set your real items and prices first.
export const REAL_PRIZES_LIVE = false;

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
  { id: 'real-stickers', name: 'Sticker Pack (real)', icon: '✨', cost: 500, real: true },
  { id: 'real-tee', name: 'T1 Tee (real)', icon: '👕', cost: 1500, real: true },
];

// Token rewards (server enforces these).
export const REWARDS = { daily: 25, play: 5, trailer: 3, song: 1, scorePer100: 1, scoreMax: 50 };
