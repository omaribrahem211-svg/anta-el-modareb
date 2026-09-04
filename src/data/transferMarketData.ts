import { Club } from '../types/game';
import { REAL_SQUADS_BY_CLUB_ID, RealPlayerTemplate } from './realPlayersData';
import { calculatePlayerValuation } from '../utils/playerGenerator';

export interface MarketListing {
  id: string;
  playerId: string;
  playerName: string;
  realPlayer: boolean;
  nationality: string;
  nationalityCode: string;
  currentClubId: string;
  currentClubName: string;
  leagueId: string;
  position: string;
  positionCategory: string;
  age: number;
  overallRating: number;
  potentialRating: number;
  marketValue: number;    // Standard Euro value
  askingPrice: number;    // Asking price with club markup
  salary: number;         // Monthly wage
  contractMonths: number;
  listedAt: number;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    goalkeeping?: number;
  };
}

/**
 * Format currency in millions or thousands cleanly
 * e.g. 180,000,000 -> "€180.0M" or "180 مليون يورو"
 */
export function formatMoneyEuro(amount: number, locale: 'ar' | 'en' = 'ar'): string {
  if (amount >= 1000000) {
    const millions = (amount / 1000000).toFixed(1).replace(/\.0$/, '');
    return locale === 'ar' ? `${millions} مليون يورو` : `€${millions}M`;
  }
  if (amount >= 1000) {
    const thousands = Math.round(amount / 1000);
    return locale === 'ar' ? `${thousands} ألف يورو` : `€${thousands}K`;
  }
  return `${amount} يورو`;
}

/**
 * Calculate realistic market value based on overall, potential, age, and position
 */
export function calculateRealisticMarketValue(
  overall: number,
  potential: number,
  age: number,
  positionCategory: any
): { marketValue: number; salary: number } {
  return calculatePlayerValuation(overall, potential, age, positionCategory);
}

// Club name mapping for Arabic display
const CLUB_DISPLAY_NAMES: Record<string, string> = {
  'esp1_madrid': 'ريال مدريد',
  'esp1_barca': 'برشلونة',
  'esp1_atletico': 'أتلتيكو مدريد',
  'eng1_city': 'مانشستر سيتي',
  'eng1_liverpool': 'ليفربول',
  'eng1_arsenal': 'أرسنال',
  'eng1_united': 'مانشستر يونايتد',
  'eng1_chelsea': 'تشيلسي',
  'eng1_spurs': 'توتنهام',
  'ger_bayern': 'بايرن ميونخ',
  'ger_dortmund': 'بوروسيا دورتموند',
  'ger_leverkusen': 'باير ليفركوزن',
  'ita_inter': 'إنتر ميلان',
  'ita_juve': 'يوفنتوس',
  'ita_milan': 'إيه سي ميلان',
  'fra_paris': 'باريس سان جيرمان',
  'fra_monaco': 'موناكو',
  'fra_marseille': 'مارسيليا',
  'sau1_hilal': 'الهلال السعودي',
  'sau1_nassr': 'النصر السعودي',
  'sau1_ittihad': 'الاتحاد السعودي',
  'sau1_ahli': 'الأهلي السعودي',
  'eg1_ahly': 'النادي الأهلي المصري',
  'eg1_zamalek': 'نادي الزمالك',
  'eg1_pyramids': 'نادي بيراميدز',
};

/**
 * Generate refreshed transfer market listings directly from real football players & squads
 */
export function generateTransferMarketListings(
  userLeagueId: string,
  userCountryCode: string,
  currentClubs: Club[] = []
): MarketListing[] {
  const listings: MarketListing[] = [];
  const addedPlayerIds = new Set<string>();

  // 1. Gather all real player templates from the master registry
  const allRealTemplates: RealPlayerTemplate[] = [];
  Object.entries(REAL_SQUADS_BY_CLUB_ID).forEach(([clubId, squad]) => {
    squad.forEach(playerTmpl => {
      allRealTemplates.push({ ...playerTmpl, clubId });
    });
  });

  // Also collect players from runtime currentClubs if available
  currentClubs.forEach(club => {
    if (club.players && club.players.length > 0) {
      club.players.forEach(p => {
        if (!allRealTemplates.some(t => t.id === p.id)) {
          allRealTemplates.push({
            id: p.id,
            name: p.name,
            firstName: p.firstName,
            lastName: p.lastName,
            nationality: p.nationality,
            nationalityCode: p.nationalityCode,
            clubId: club.id,
            leagueId: club.leagueId,
            position: p.position,
            positionCategory: p.positionCategory,
            age: p.age,
            overallRating: p.overallRating,
            potentialRating: p.potentialRating,
            marketValue: p.marketValue,
            salary: p.salary,
            preferredFoot: p.preferredFoot,
            number: p.number,
            personality: p.personality,
            attributes: p.attributes,
          });
        }
      });
    }
  });

  // Function to add a listing
  const addListing = (tmpl: RealPlayerTemplate) => {
    if (addedPlayerIds.has(tmpl.id)) return;
    addedPlayerIds.add(tmpl.id);

    const club = currentClubs.find(c => c.id === tmpl.clubId);
    const clubName = club ? club.name : (CLUB_DISPLAY_NAMES[tmpl.clubId] || tmpl.clubId.replace(/^[a-z]+[0-9]*_/, '').replace(/_/g, ' '));
    
    // Calculate realistic valuation
    const valuation = calculatePlayerValuation(
      tmpl.overallRating,
      tmpl.potentialRating,
      tmpl.age,
      tmpl.positionCategory
    );
    const finalMarketValue = tmpl.marketValue > 500000 ? tmpl.marketValue : valuation.marketValue;
    const finalSalary = tmpl.salary > 5000 ? tmpl.salary : valuation.salary;

    const askingMarkup = 1.05 + (Math.random() * 0.20);
    const askingPrice = Math.round((finalMarketValue * askingMarkup) / 50000) * 50000;

    listings.push({
      id: `mkt_${tmpl.id}_${Date.now()}`,
      playerId: tmpl.id,
      playerName: tmpl.name,
      realPlayer: true,
      nationality: tmpl.nationality,
      nationalityCode: tmpl.nationalityCode,
      currentClubId: tmpl.clubId,
      currentClubName: clubName,
      leagueId: tmpl.leagueId || userLeagueId,
      position: tmpl.position,
      positionCategory: tmpl.positionCategory,
      age: tmpl.age,
      overallRating: tmpl.overallRating,
      potentialRating: tmpl.potentialRating,
      marketValue: finalMarketValue,
      askingPrice,
      salary: finalSalary,
      contractMonths: 12 + Math.floor(Math.random() * 36),
      listedAt: Date.now(),
      attributes: tmpl.attributes,
    });
  };

  // 2. Select a balanced, exciting collection of real players for the market:
  // a) World Superstars (88+)
  const superstars = allRealTemplates
    .filter(p => p.overallRating >= 88)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);
  superstars.forEach(addListing);

  // b) Top European & Global Elite (83 - 87)
  const elite = allRealTemplates
    .filter(p => p.overallRating >= 83 && p.overallRating < 88)
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
  elite.forEach(addListing);

  // c) Young Wonderkids & High Potential Talents (Age <= 23, Potential >= 84)
  const wonderkids = allRealTemplates
    .filter(p => p.age <= 23 && p.potentialRating >= 84)
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);
  wonderkids.forEach(addListing);

  // d) League-specific & Regional Stars (from user league / Arab / African / South American competitions)
  const regionalStars = allRealTemplates
    .filter(p => p.leagueId === userLeagueId || p.nationalityCode === userCountryCode || ['EGY', 'SAU', 'MAR', 'ALG', 'TUN', 'BRA', 'ARG'].includes(p.nationalityCode))
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
  regionalStars.forEach(addListing);

  // e) Affordable Quality Squad Players (75 - 82)
  const squadPlayers = allRealTemplates
    .filter(p => p.overallRating >= 75 && p.overallRating <= 82)
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
  squadPlayers.forEach(addListing);

  return listings;
}
