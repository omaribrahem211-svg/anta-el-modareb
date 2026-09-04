import { Club } from '../types/game';
import { createClub } from './realClubsData';
import { INITIAL_TEAMS } from './initialData';
import {
  EGYPT_TIER_1_TEAMS,
  EGYPT_TIER_2_TEAMS,
  EGYPT_TIER_3_TEAMS,
  SAUDI_TIER_1_TEAMS,
  SAUDI_TIER_2_TEAMS,
  UAE_TIER_1_TEAMS,
  QATAR_TIER_1_TEAMS,
  MOROCCO_TIER_1_TEAMS,
  TUNISIA_TIER_1_TEAMS,
  ALGERIA_TIER_1_TEAMS,
  SPAIN_TIER_1_TEAMS,
  SPAIN_TIER_2_TEAMS,
  ENGLAND_TIER_1_TEAMS,
  ENGLAND_TIER_2_TEAMS,
  FRANCE_TIER_1_TEAMS,
  ITALY_TIER_1_TEAMS,
  GERMANY_TIER_1_TEAMS,
  BRAZIL_TIER_1_TEAMS,
  ARGENTINA_TIER_1_TEAMS,
} from './leaguesData';

export { createClub };

// ----------------------------------------------------
// 1. EGYPTIAN LEAGUES (TIERS 1 TO 4)
// ----------------------------------------------------

export const EGYPT_TIER_4_CLUBS: Club[] = INITIAL_TEAMS;
export const EGYPT_TIER_3_CLUBS: Club[] = EGYPT_TIER_3_TEAMS;
export const EGYPT_TIER_2_CLUBS: Club[] = EGYPT_TIER_2_TEAMS;
export const EGYPT_TIER_1_CLUBS: Club[] = EGYPT_TIER_1_TEAMS;

// ----------------------------------------------------
// 2. SAUDI ARABIAN LEAGUES (TIERS 1 & 2)
// ----------------------------------------------------

export const SAUDI_TIER_1_CLUBS: Club[] = SAUDI_TIER_1_TEAMS;
export const SAUDI_TIER_2_CLUBS: Club[] = SAUDI_TIER_2_TEAMS;

// ----------------------------------------------------
// 3. UAE & QATAR
// ----------------------------------------------------

export const UAE_TIER_1_CLUBS: Club[] = UAE_TIER_1_TEAMS;
export const QATAR_TIER_1_CLUBS: Club[] = QATAR_TIER_1_TEAMS;

// ----------------------------------------------------
// 4. NORTH AFRICA (MOROCCO, TUNISIA, ALGERIA)
// ----------------------------------------------------

export const MOROCCO_TIER_1_CLUBS: Club[] = MOROCCO_TIER_1_TEAMS;
export const TUNISIA_TIER_1_CLUBS: Club[] = TUNISIA_TIER_1_TEAMS;
export const ALGERIA_TIER_1_CLUBS: Club[] = ALGERIA_TIER_1_TEAMS;

// ----------------------------------------------------
// 5. EUROPEAN LEAGUES (SPAIN, ENGLAND, FRANCE, ITALY, GERMANY)
// ----------------------------------------------------

export const SPAIN_TIER_1_CLUBS: Club[] = SPAIN_TIER_1_TEAMS;
export const SPAIN_TIER_2_CLUBS: Club[] = SPAIN_TIER_2_TEAMS;

export const ENGLAND_TIER_1_CLUBS: Club[] = ENGLAND_TIER_1_TEAMS;
export const ENGLAND_TIER_2_CLUBS: Club[] = ENGLAND_TIER_2_TEAMS;

export const FRANCE_TIER_1_CLUBS: Club[] = FRANCE_TIER_1_TEAMS;
export const ITALY_TIER_1_CLUBS: Club[] = ITALY_TIER_1_TEAMS;
export const GERMANY_TIER_1_CLUBS: Club[] = GERMANY_TIER_1_TEAMS;

// ----------------------------------------------------
// 6. SOUTH AMERICA (BRAZIL & ARGENTINA)
// ----------------------------------------------------

export const BRAZIL_TIER_1_CLUBS: Club[] = BRAZIL_TIER_1_TEAMS;
export const ARGENTINA_TIER_1_CLUBS: Club[] = ARGENTINA_TIER_1_TEAMS;
