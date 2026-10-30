/**
 * Deterministic SVG Avatar Generator for Football Simulation Players
 *
 * Generates unique, consistent, stylized football player portraits
 * derived entirely from the player's ID, nationality, and club colors.
 * Zero external requests or licensed photos.
 */

// Simple deterministic string hash (djb2 variant)
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface AvatarTraits {
  skinTone: string;
  skinShadow: string;
  hairColor: string;
  hairStyle: 'buzz' | 'taper' | 'curly' | 'fade' | 'wavy' | 'afro' | 'bald' | 'pompadour';
  beardStyle: 'none' | 'stubble' | 'goatee' | 'beard';
  jerseyPrimary: string;
  jerseySecondary: string;
  hasHeadband: boolean;
  eyeColor: string;
}

const SKIN_PALETTES = [
  { tone: '#fed0b0', shadow: '#e6b290' }, // Fair
  { tone: '#f3be98', shadow: '#dca37b' }, // Light Tan
  { tone: '#dfa37a', shadow: '#c48962' }, // Medium Tan / Olive
  { tone: '#c48b61', shadow: '#a77047' }, // Bronze
  { tone: '#9c6644', shadow: '#7f4f31' }, // Warm Dark Bronze
  { tone: '#6f452a', shadow: '#53311b' }, // Deep Brown
  { tone: '#4a2f1d', shadow: '#362012' }, // Very Deep
];

const HAIR_COLORS = [
  '#171717', // Jet Black
  '#2a1d17', // Dark Chocolate
  '#4a3328', // Medium Brown
  '#6a4732', // Chestnut Brown
  '#b49463', // Dirty Blonde
  '#242426', // Soft Black
];

/**
 * Derives consistent avatar traits from player metadata
 */
export function getAvatarTraits(
  playerId: string,
  nationality?: string,
  nationalityCode?: string,
  clubPrimary?: string,
  clubSecondary?: string
): AvatarTraits {
  const hash = hashString(`${playerId}_${nationality || ''}_${nationalityCode || ''}`);
  
  // Region-weighted skin tone selection
  const code = (nationalityCode || '').toUpperCase();
  const nat = nationality || '';
  let skinIdx: number;

  if (['EGY', 'MAR', 'ALG', 'TUN', 'SAU', 'UAE', 'QAT', 'JOR', 'IRQ', 'SYR', 'LBN', 'LBY', 'SDN', 'KUW'].includes(code) ||
      /مصر|سعودية|مغرب|تونس|جزائر|إمارات|قطر|عراق|سودان/.test(nat)) {
    // Arab / North African: predominantly medium tan, olive, bronze, with light/deep variants
    const paletteOptions = [1, 2, 2, 3, 3, 4, 1, 5];
    skinIdx = paletteOptions[hash % paletteOptions.length];
  } else if (['NGA', 'GHA', 'SEN', 'CIV', 'CMR', 'MLI', 'COD', 'RSA', 'GUI', 'ANG', 'BFA'].includes(code)) {
    // Sub-Saharan Africa
    const paletteOptions = [4, 5, 5, 6, 6];
    skinIdx = paletteOptions[hash % paletteOptions.length];
  } else if (['NOR', 'SWE', 'DEN', 'ENG', 'GER', 'NED', 'POL', 'SCO', 'IRL', 'ISL'].includes(code)) {
    // Northern / Central Europe
    const paletteOptions = [0, 0, 1, 1, 2];
    skinIdx = paletteOptions[hash % paletteOptions.length];
  } else {
    skinIdx = hash % SKIN_PALETTES.length;
  }

  const skin = SKIN_PALETTES[skinIdx] || SKIN_PALETTES[2];

  const hairStyles: AvatarTraits['hairStyle'][] = [
    'buzz', 'taper', 'curly', 'fade', 'wavy', 'afro', 'bald', 'pompadour',
  ];
  const hairStyle = hairStyles[(hash >> 3) % hairStyles.length];

  const beardStyles: AvatarTraits['beardStyle'][] = ['none', 'none', 'stubble', 'goatee', 'beard'];
  const beardStyle = beardStyles[(hash >> 6) % beardStyles.length];

  const hairColor = HAIR_COLORS[(hash >> 9) % HAIR_COLORS.length];
  const hasHeadband = (hash % 11 === 0) && (hairStyle === 'curly' || hairStyle === 'wavy');

  const jerseyPrimary = clubPrimary || '#dc2626';
  const jerseySecondary = clubSecondary || '#ffffff';

  return {
    skinTone: skin.tone,
    skinShadow: skin.shadow,
    hairColor,
    hairStyle,
    beardStyle,
    jerseyPrimary,
    jerseySecondary,
    hasHeadband,
    eyeColor: '#1e293b',
  };
}
