// Tunable numbers, colours and screen names for Gobbler's Getaway. The game is laid out in a
// fixed 1280x800 logical field; the renderer scales that field to whatever window it is given,
// so no rule or drawing below depends on the real screen size.

export const FIELD = {
  width: 1280,
  height: 800,
  groundY: 672,
  playerX: 330,
};

/** The simulation runs on a fixed 1/60 s step, independent of the display's refresh rate. */
export const STEP = 1 / 60;

export const SCREENS = {
  title: 'title',
  play: 'play',
  paused: 'paused',
  end: 'end',
};

export const PLAYER = {
  standWidth: 54,
  standHeight: 104,
  duckWidth: 70,
  duckHeight: 46,
  runSpeed: 382,
  duckSpeed: 252,
  boostScale: 1.4,
  gapStart: 192,
  gapMax: 288,
  gapCatch: 25,
  gravity: 2500,
  jumpVelocity: -1200,
  jumpCut: -430,
  coyoteTime: 0.11,
  jumpBufferTime: 0.12,
  fastFallScale: 1.75,
  invulnerableTime: 1.25,
  stumbleTime: 0.58,
  boostTime: 5.5,
};

export const DISTANCE = {
  metresPerPixel: 0.04,
  escapeMetres: 800,
};

export const LIVES = 3;

/** How far ahead of the player new things are placed, in world pixels. */
export const SPAWN = {
  ahead: 1100,
  hazardGapMin: 660,
  hazardGapMax: 920,
  pickupGapMin: 275,
  pickupGapMax: 470,
  initialHazard: 950,
  initialPickup: 660,
};

export const HAZARDS = {
  hay: { width: 94, height: 56 },
  fence: { width: 100, height: 84 },
  oven: { width: 120, height: 100 },
  fork: { width: 90, height: 62 },
  knife: { width: 114, height: 54, float: true },
};

/** The knife's box is high enough to catch a standing turkey but low enough to duck under. */
export const KNIFE_TOP = FIELD.groundY - 110;

export const CORN = { width: 28, height: 32, points: 20, comboTime: 2.6, comboMax: 5 };
export const FEATHER = { width: 34, height: 66, points: 100 };

export const PALETTE = {
  ink: '#1b1420',
  cream: '#fff2d5',
  muted: '#cbb8a2',
  gold: '#ffc857',
  goldDeep: '#c78a2f',
  rust: '#d8683f',
  red: '#e0503c',
  green: '#8fd694',
  skyTop: '#18213a',
  skyMid: '#4e3f63',
  skyLow: '#b06668',
  horizon: '#ffb56a',
  sun: '#ffe6ad',
  hillFar: '#372e4a',
  hillMid: '#4c3444',
  hillNear: '#633d36',
  field: '#4a2e25',
  fieldDark: '#2f1e1c',
  path: '#5a3827',
  pathLight: '#70452c',
  barn: '#8e3b32',
  barnDark: '#632a2a',
  roof: '#3b2326',
  trunk: '#3c2721',
  leafOrange: '#d9793f',
  leafGold: '#e8a847',
  leafRed: '#a84434',
  leafBrown: '#7f4a32',
  turkey: '#a65c32',
  turkeyLight: '#c47b44',
  turkeyDark: '#784022',
  tail: ['#f0c179', '#d98a45', '#b65c34', '#e6ad63', '#8d4a2c'],
  wattle: '#d34237',
  beak: '#f4b942',
  leg: '#d98b3d',
  farmerShirt: '#a8473c',
  farmerOveralls: '#496787',
  farmerSkin: '#d79a6d',
  farmerHat: '#d9b26b',
  knife: '#d8dde4',
  knifeDark: '#8d97a5',
  handle: '#6f4129',
  corn: '#f5c542',
  cornLeaf: '#7f9a45',
  panel: 'rgba(27, 20, 32, 0.88)',
  panelLight: 'rgba(58, 40, 49, 0.9)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_SERIF = 'Georgia, "Times New Roman", serif';
export const BEST_KEY = 'gobbler-getaway.best';
export const MUTE_KEY = 'gobbler-getaway.muted';
