import { Club, Player, Position } from '../types/game';

// Helper to create fully typed real players with valid attributes, stats, and contracts
export function createLowerTierPlayer(
  id: string,
  name: string,
  position: Position,
  age: number,
  overallRating: number,
  marketValue: number,
  salary: number,
  number: number,
  nationality: string,
  nationalityCode: string,
  currentClubId: string,
  currentLeagueId: string
): Player {
  const isGK = position === 'GK';
  const posCat = isGK ? 'GK' : ['CB', 'LB', 'RB'].includes(position) ? 'DEF' : ['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(position) ? 'MID' : 'FWD';

  const baseAttr = overallRating;
  const attributes = {
    pace: isGK ? Math.max(35, baseAttr - 20) : Math.min(95, baseAttr + (posCat === 'FWD' ? 6 : posCat === 'DEF' ? -3 : 2)),
    shooting: isGK ? 18 : Math.min(92, baseAttr + (posCat === 'FWD' ? 8 : posCat === 'MID' ? 2 : -15)),
    passing: isGK ? Math.max(45, baseAttr - 5) : Math.min(94, baseAttr + (posCat === 'MID' ? 7 : 0)),
    dribbling: isGK ? 25 : Math.min(94, baseAttr + (posCat === 'MID' ? 5 : posCat === 'FWD' ? 4 : -10)),
    defending: isGK ? 20 : Math.min(94, baseAttr + (posCat === 'DEF' ? 8 : posCat === 'MID' ? 0 : -25)),
    physical: Math.min(95, baseAttr + (posCat === 'DEF' ? 5 : 0)),
    goalkeeping: isGK ? baseAttr : 25,
  };

  return {
    id,
    name,
    age,
    position,
    positionCategory: posCat,
    overallRating,
    potentialRating: Math.min(94, overallRating + Math.max(1, 30 - age)),
    attributes,
    salary,
    marketValue,
    morale: 85,
    fitness: 100,
    form: 7.0,
    number,
    nationality,
    nationalityCode,
    currentClubId,
    currentLeagueId,
    stats: {
      appearances: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      averageRating: 7.0,
    },
    contractYears: Math.floor(Math.random() * 3) + 2,
    trainingFocus: 'general',
  };
}

// Universal factory for lower tier clubs with complete real squads
export function createLowerTierClub(
  id: string,
  name: string,
  shortName: string,
  city: string,
  country: string,
  countryCode: string,
  division: number,
  leagueId: string,
  reputation: number,
  primaryColor: string,
  secondaryColor: string,
  budget: number,
  transferBudget: number,
  wageBudgetMonthly: number,
  stadiumName: string,
  stadiumCapacity: number,
  playersList: Player[]
): Club {
  const startingPlayerIds = playersList.slice(0, 11).map(p => p.id);
  const benchPlayerIds = playersList.slice(11, 18).map(p => p.id);

  return {
    id,
    name,
    shortName,
    city,
    country,
    countryCode,
    countryId: countryCode,
    division,
    leagueId,
    reputation,
    budget,
    transferBudget,
    wageBudgetMonthly,
    primaryColor,
    secondaryColor,
    isUserClub: false,
    facilities: {
      stadiumName,
      stadiumCapacity,
      stadiumLevel: Math.max(1, Math.min(5, Math.floor(reputation / 20))),
      medicalCenterLevel: Math.max(1, Math.min(5, Math.floor(reputation / 22))),
      trainingGroundLevel: Math.max(1, Math.min(5, Math.floor(reputation / 22))),
      youthAcademyLevel: Math.max(1, Math.min(5, Math.floor(reputation / 22))),
      scoutingNetworkLevel: Math.max(1, Math.min(5, Math.floor(reputation / 22))),
    },
    tactics: {
      formation: '4-3-3',
      mentality: 'balanced',
      passingStyle: 'short',
      pressingIntensity: 'balanced',
      tempo: 'balanced',
      startingPlayerIds,
      benchPlayerIds,
      captainId: playersList[0]?.id || '',
      penaltyTakerId: playersList[0]?.id || '',
      freeKickTakerId: playersList[0]?.id || '',
      cornerTakerId: playersList[0]?.id || '',
    },
    players: playersList,
    sponsors: [],
  };
}

// ============================================================================
// 1. ENGLISH LEAGUE ONE (eng_tier_3) - 16 CLUBS WITH REAL PLAYERS
// ============================================================================
export const ENGLAND_LEAGUE_ONE_CLUBS: Club[] = [
  createLowerTierClub('eng3_birmingham', 'بيرمنغهام سيتي', 'بيرمنغهام', 'برمنغهام', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 68, '#0000ff', '#ffffff', 18000000, 8000000, 1500000, 'سانت أندروز', 29400, [
    createLowerTierPlayer('eng3_bir_1', 'ريان ألسوب', 'GK', 32, 72, 800000, 30000, 1, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_2', 'كريستوف كلارر', 'CB', 24, 74, 2500000, 45000, 4, 'النمسا', 'AUT', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_3', 'بايليك بيليك', 'CB', 26, 73, 2000000, 40000, 5, 'بولندا', 'POL', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_4', 'أليكس كوكرين', 'LB', 24, 72, 1800000, 35000, 3, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_5', 'إيثان ليرد', 'RB', 23, 72, 1900000, 35000, 2, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_6', 'بايك سيونغ-هو', 'CM', 27, 75, 3000000, 55000, 13, 'كوريا الجنوبية', 'KOR', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_7', 'توموكاي إيواتا', 'CDM', 27, 74, 2800000, 50000, 24, 'اليابان', 'JPN', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_8', 'ويلوم ويلومسون', 'CAM', 25, 75, 3200000, 55000, 18, 'آيسلندا', 'ISL', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_9', 'إيميل هانسون', 'LW', 26, 73, 2200000, 40000, 11, 'السويد', 'SWE', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_10', 'كشيشتوف رينغرز', 'RW', 25, 72, 1700000, 35000, 7, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_11', 'جاي ستانسفيلد', 'ST', 21, 76, 5000000, 65000, 28, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_12', 'ألفي ماي', 'ST', 31, 73, 1200000, 38000, 9, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_13', 'ليندون دايكس', 'ST', 29, 72, 1600000, 40000, 17, 'إسكتلندا', 'SCO', 'eng3_birmingham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bir_14', 'تايلور غاردنر-هيكمان', 'CM', 23, 71, 1500000, 32000, 14, 'إنجلترا', 'ENG', 'eng3_birmingham', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_wrexham', 'ريكسهام إف سي', 'ريكسهام', 'ريكسهام', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 66, '#dc2626', '#ffffff', 14000000, 6000000, 1200000, 'ريسكورس غراوند', 12600, [
    createLowerTierPlayer('eng3_wre_1', 'آرثر أوكونكو', 'GK', 23, 72, 1500000, 30000, 1, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_2', 'إيغان أوكونيل', 'CB', 28, 70, 900000, 25000, 6, 'أيرلندا', 'IRL', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_3', 'ماكس كليورث', 'CB', 22, 71, 1400000, 28000, 32, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_4', 'جيمس ماكلين', 'LB', 35, 71, 600000, 35000, 23, 'أيرلندا', 'IRL', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_5', 'ريان بارنيت', 'RB', 25, 70, 950000, 24000, 29, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_6', 'جورج دوبسون', 'CDM', 26, 72, 1600000, 32000, 14, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_7', 'أندي كانون', 'CM', 28, 71, 1100000, 28000, 20, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_8', 'إيليوت لي', 'CAM', 29, 73, 1800000, 38000, 38, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_9', 'أولي بالمر', 'ST', 32, 70, 700000, 26000, 9, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_10', 'بول مولين الهداف', 'ST', 29, 74, 2200000, 45000, 10, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_11', 'جاك ماريوت', 'ST', 30, 72, 1300000, 32000, 11, 'إنجلترا', 'ENG', 'eng3_wrexham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wre_12', 'ستيفن فليتشر', 'ST', 37, 68, 300000, 20000, 26, 'إسكتلندا', 'SCO', 'eng3_wrexham', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_bolton', 'بولتون واندررز', 'بولتون', 'بولتون', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 65, '#ffffff', '#1e3a8a', 9000000, 3500000, 950000, 'تافشيت كوميونيتي', 28700, [
    createLowerTierPlayer('eng3_bol_1', 'ناثان باكستر', 'GK', 25, 71, 1200000, 25000, 1, 'إنجلترا', 'ENG', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_2', 'ريكاردو سانتوس', 'CB', 29, 73, 1700000, 35000, 5, 'البرتغال', 'POR', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_3', 'إيون توال', 'CB', 26, 71, 1100000, 24000, 18, 'أيرلندا الشمالية', 'NIR', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_4', 'جورج جونستون', 'CB', 26, 70, 950000, 22000, 6, 'إسكتلندا', 'SCO', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_5', 'جورج توماسون', 'CM', 23, 72, 1600000, 28000, 8, 'إنجلترا', 'ENG', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_6', 'جوش شيهان', 'CM', 29, 73, 1500000, 30000, 4, 'ويلز', 'WAL', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_7', 'كايل ديمبسي', 'CAM', 28, 71, 1200000, 26000, 22, 'إنجلترا', 'ENG', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_8', 'ديون تشارلز', 'ST', 28, 74, 2500000, 40000, 10, 'أيرلندا الشمالية', 'NIR', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_9', 'فيكتور أديبوييجو', 'ST', 26, 71, 1300000, 25000, 14, 'نيجيريا', 'NGA', 'eng3_bolton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bol_10', 'جون مكأتي', 'CF', 25, 72, 1700000, 28000, 7, 'إنجلترا', 'ENG', 'eng3_bolton', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_huddersfield', 'هدرسفيلد تاون', 'هدرسفيلد', 'هدرسفيلد', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 64, '#0284c7', '#ffffff', 8500000, 3200000, 900000, 'جون سميثز ستاديوم', 24100, [
    createLowerTierPlayer('eng3_hud_1', 'لي نيكولز', 'GK', 31, 72, 1100000, 28000, 1, 'إنجلترا', 'ENG', 'eng3_huddersfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_hud_2', 'ميكال هليك', 'CB', 28, 73, 1900000, 35000, 5, 'بولندا', 'POL', 'eng3_huddersfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_hud_3', 'توم ليز', 'CB', 33, 70, 600000, 25000, 4, 'إنجلترا', 'ENG', 'eng3_huddersfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_hud_4', 'جوناثان هوغ', 'CDM', 35, 69, 450000, 25000, 6, 'إنجلترا', 'ENG', 'eng3_huddersfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_hud_5', 'بين وايلز', 'CM', 25, 72, 1600000, 28000, 8, 'إنجلترا', 'ENG', 'eng3_huddersfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_hud_6', 'جوش كوروروما', 'LW', 25, 73, 2000000, 32000, 10, 'سيراليون', 'SLE', 'eng3_huddersfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_hud_7', 'داني وارد', 'ST', 33, 70, 650000, 26000, 25, 'إنجلترا', 'ENG', 'eng3_huddersfield', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_reading', 'نادي ريدينغ', 'ريدينغ', 'ريدينغ', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 63, '#1d4ed8', '#ffffff', 7000000, 2500000, 800000, 'ماديجسكي ستاديوم', 24100, [
    createLowerTierPlayer('eng3_rea_1', 'جويل بيريرا', 'GK', 28, 71, 950000, 22000, 1, 'البرتغال', 'POR', 'eng3_reading', 'eng_tier_3'),
    createLowerTierPlayer('eng3_rea_2', 'أمادو مبينغي', 'CB', 22, 72, 1800000, 25000, 27, 'السنغال', 'SEN', 'eng3_reading', 'eng_tier_3'),
    createLowerTierPlayer('eng3_rea_3', 'تايلر بيندون', 'CB', 19, 71, 2200000, 20000, 4, 'نيوزيلندا', 'NZL', 'eng3_reading', 'eng_tier_3'),
    createLowerTierPlayer('eng3_rea_4', 'لويس وينغ', 'CM', 29, 74, 2400000, 35000, 8, 'إنجلترا', 'ENG', 'eng3_reading', 'eng_tier_3'),
    createLowerTierPlayer('eng3_rea_5', 'هارفي كنيبس', 'CAM', 25, 72, 1700000, 26000, 7, 'إنجلترا', 'ENG', 'eng3_reading', 'eng_tier_3'),
    createLowerTierPlayer('eng3_rea_6', 'سام سميث', 'ST', 26, 73, 2100000, 32000, 10, 'إنجلترا', 'ENG', 'eng3_reading', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_blackpool', 'نادي بلاكبول', 'بلاكبول', 'بلاكبول', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 63, '#ea580c', '#ffffff', 7200000, 2600000, 820000, 'بلومفيلد رود', 16600, [
    createLowerTierPlayer('eng3_bla_1', 'دان غريمسو', 'GK', 26, 71, 1100000, 24000, 1, 'إنجلترا', 'ENG', 'eng3_blackpool', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bla_2', 'جيمس هزبند', 'LB', 30, 70, 750000, 22000, 3, 'إنجلترا', 'ENG', 'eng3_blackpool', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bla_3', 'أولي نوربورن', 'CM', 31, 71, 900000, 25000, 6, 'أنتيغوا', 'ATG', 'eng3_blackpool', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bla_4', 'كايل جوزيف', 'ST', 22, 72, 1800000, 26000, 9, 'إسكتلندا', 'SCO', 'eng3_blackpool', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_barnsley', 'نادي بارنسلي', 'بارنسلي', 'بارنسلي', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 62, '#dc2626', '#ffffff', 6800000, 2400000, 780000, 'أوكويل', 23200, [
    createLowerTierPlayer('eng3_bar_1', 'غابرييل سلونينا', 'GK', 20, 72, 2500000, 25000, 1, 'أمريكا', 'USA', 'eng3_barnsley', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bar_2', 'لوكا كونيل', 'CM', 23, 73, 2100000, 30000, 8, 'أيرلندا', 'IRL', 'eng3_barnsley', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bar_3', 'ستيفن همفريز', 'ST', 26, 71, 1300000, 24000, 44, 'إنجلترا', 'ENG', 'eng3_barnsley', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_wigan', 'ويغان أثليتيك', 'ويغان', 'ويغان', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 62, '#2563eb', '#ffffff', 6500000, 2200000, 750000, 'دي دبليو ستاديوم', 25100, [
    createLowerTierPlayer('eng3_wig_1', 'سام تيكل', 'GK', 22, 73, 3000000, 28000, 1, 'إنجلترا', 'ENG', 'eng3_wigan', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wig_2', 'جايسون كير', 'CB', 27, 71, 1100000, 23000, 5, 'إسكتلندا', 'SCO', 'eng3_wigan', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wig_3', 'مات سميث', 'CM', 23, 72, 1700000, 26000, 8, 'إنجلترا', 'ENG', 'eng3_wigan', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wig_4', 'ثيلو أسغارد', 'CAM', 22, 73, 2400000, 30000, 10, 'إنجلترا', 'ENG', 'eng3_wigan', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_charlton', 'تشارلتون أثليتيك', 'تشارلتون', 'لندن', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 63, '#dc2626', '#ffffff', 7500000, 2800000, 850000, 'ذا فالي', 27100, [
    createLowerTierPlayer('eng3_cha_1', 'ويل مانيون', 'GK', 26, 70, 800000, 20000, 1, 'إنجلترا', 'ENG', 'eng3_charlton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_cha_2', 'لويد جونز', 'CB', 28, 72, 1400000, 26000, 5, 'إنجلترا', 'ENG', 'eng3_charlton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_cha_3', 'كونور كوفنتري', 'CM', 24, 72, 1600000, 28000, 6, 'أيرلندا', 'IRL', 'eng3_charlton', 'eng_tier_3'),
    createLowerTierPlayer('eng3_cha_4', 'ماتي جودين', 'ST', 33, 71, 850000, 26000, 24, 'إنجلترا', 'ENG', 'eng3_charlton', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_peterborough', 'بيتربورو يونايتد', 'بيتربورو', 'بيتربورو', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 61, '#1d4ed8', '#ffffff', 5800000, 2000000, 700000, 'لندن رود', 15300, [
    createLowerTierPlayer('eng3_pet_1', 'نيكولاس بيلوكابيتش', 'GK', 21, 69, 750000, 18000, 1, 'أستراليا', 'AUS', 'eng3_peterborough', 'eng_tier_3'),
    createLowerTierPlayer('eng3_pet_2', 'أرتشي كولينز', 'CM', 24, 72, 1800000, 26000, 8, 'إنجلترا', 'ENG', 'eng3_peterborough', 'eng_tier_3'),
    createLowerTierPlayer('eng3_pet_3', 'كوامي بوكو', 'RW', 23, 73, 2500000, 30000, 11, 'غانا', 'GHA', 'eng3_peterborough', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_wycombe', 'وايكومب واندررز', 'وايكومب', 'هاي وايكومب', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 61, '#0284c7', '#000000', 5500000, 1800000, 680000, 'آدامز بارك', 10100, [
    createLowerTierPlayer('eng3_wyc_1', 'فرانكو رافيولي', 'GK', 23, 70, 900000, 20000, 1, 'إنجلترا', 'ENG', 'eng3_wycombe', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wyc_2', 'جاك غرريمر', 'RB', 30, 69, 650000, 19000, 2, 'إسكتلندا', 'SCO', 'eng3_wycombe', 'eng_tier_3'),
    createLowerTierPlayer('eng3_wyc_3', 'ريتشارد كوني', 'ST', 21, 71, 1500000, 22000, 9, 'إنجلترا', 'ENG', 'eng3_wycombe', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_lincoln', 'لينكولن سيتي', 'لينكولن', 'لينكولن', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 60, '#dc2626', '#ffffff', 5200000, 1600000, 650000, 'سينسيل بانك', 10700, [
    createLowerTierPlayer('eng3_lin_1', 'جورج ويكينز', 'GK', 22, 69, 800000, 18000, 1, 'إنجلترا', 'ENG', 'eng3_lincoln', 'eng_tier_3'),
    createLowerTierPlayer('eng3_lin_2', 'باكستون بورسيك', 'CB', 24, 71, 1300000, 22000, 4, 'إنجلترا', 'ENG', 'eng3_lincoln', 'eng_tier_3'),
    createLowerTierPlayer('eng3_lin_3', 'بن هاوس', 'ST', 25, 71, 1400000, 24000, 18, 'إسكتلندا', 'SCO', 'eng3_lincoln', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_rotherham', 'روثرهام يونايتد', 'روثرهام', 'روثرهام', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 62, '#dc2626', '#ffffff', 6000000, 2100000, 720000, 'نيويورك ستاديوم', 12000, [
    createLowerTierPlayer('eng3_rot_1', 'كاميرون داوسون', 'GK', 29, 71, 1000000, 22000, 1, 'إنجلترا', 'ENG', 'eng3_rotherham', 'eng_tier_3'),
    createLowerTierPlayer('eng3_rot_2', 'جوليون كلارك-هاريس', 'ST', 30, 73, 1900000, 32000, 9, 'جامايكا', 'JAM', 'eng3_rotherham', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_exeter', 'إكستر سيتي', 'إكستر', 'إكستر', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 59, '#dc2626', '#000000', 4800000, 1400000, 580000, 'سانت جيمس بارك', 8700, [
    createLowerTierPlayer('eng3_exe_1', 'جو ويتوورث', 'GK', 20, 69, 850000, 16000, 1, 'إنجلترا', 'ENG', 'eng3_exeter', 'eng_tier_3'),
    createLowerTierPlayer('eng3_exe_2', 'إيلري نيسبت', 'ST', 26, 70, 1100000, 20000, 9, 'إنجلترا', 'ENG', 'eng3_exeter', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_bristol_rov', 'بريستول روفرز', 'بريستول ر.', 'بريستول', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 59, '#2563eb', '#ffffff', 4900000, 1500000, 600000, 'ميموريال ستاديوم', 12300, [
    createLowerTierPlayer('eng3_bro_1', 'جوش غريفيثس', 'GK', 22, 70, 1000000, 19000, 1, 'إنجلترا', 'ENG', 'eng3_bristol_rov', 'eng_tier_3'),
    createLowerTierPlayer('eng3_bro_2', 'بروميس أوموتشيري', 'ST', 23, 71, 1400000, 22000, 9, 'أيرلندا', 'IRL', 'eng3_bristol_rov', 'eng_tier_3'),
  ]),

  createLowerTierClub('eng3_mansfield', 'مانسفيلد تاون', 'مانسفيلد', 'مانسفيلد', 'إنجلترا', 'ENG', 3, 'eng_tier_3', 58, '#eab308', '#1e3a8a', 4500000, 1300000, 550000, 'فيلد ميل', 9100, [
    createLowerTierPlayer('eng3_man_1', 'كريستي بيم', 'GK', 29, 69, 700000, 17000, 1, 'إنجلترا', 'ENG', 'eng3_mansfield', 'eng_tier_3'),
    createLowerTierPlayer('eng3_man_2', 'ويل إيفانز', 'ST', 27, 71, 1300000, 22000, 9, 'ويلز', 'WAL', 'eng3_mansfield', 'eng_tier_3'),
  ]),
];

// ============================================================================
// 2. ENGLISH LEAGUE TWO (eng_tier_4) - 16 CLUBS WITH REAL PLAYERS
// ============================================================================
export const ENGLAND_LEAGUE_TWO_CLUBS: Club[] = [
  createLowerTierClub('eng4_bradford', 'برادفورد سيتي', 'برادفورد', 'برادفورد', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 56, '#831843', '#f59e0b', 3800000, 1200000, 480000, 'فالي باريد', 25100, [
    createLowerTierPlayer('eng4_bra_1', 'سام ووكر', 'GK', 33, 67, 400000, 14000, 1, 'إنجلترا', 'ENG', 'eng4_bradford', 'eng_tier_4'),
    createLowerTierPlayer('eng4_bra_2', 'أنتوني أوكونور', 'CB', 31, 67, 450000, 15000, 5, 'أيرلندا', 'IRL', 'eng4_bradford', 'eng_tier_4'),
    createLowerTierPlayer('eng4_bra_3', 'أليكس باتيسون', 'CM', 26, 68, 700000, 17000, 8, 'إنجلترا', 'ENG', 'eng4_bradford', 'eng_tier_4'),
    createLowerTierPlayer('eng4_bra_4', 'آندي كوك الهداف', 'ST', 33, 70, 750000, 22000, 9, 'إنجلترا', 'ENG', 'eng4_bradford', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_notts', 'نوتس كاونتي', 'نوتس كاونتي', 'نوتنغهام', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 55, '#000000', '#ffffff', 3600000, 1100000, 450000, 'ميدو لين', 19800, [
    createLowerTierPlayer('eng4_not_1', 'أليكس باس', 'GK', 26, 67, 500000, 14000, 1, 'إنجلترا', 'ENG', 'eng4_notts', 'eng_tier_4'),
    createLowerTierPlayer('eng4_not_2', 'مات بالمر', 'CM', 28, 68, 650000, 16000, 18, 'إنجلترا', 'ENG', 'eng4_notts', 'eng_tier_4'),
    createLowerTierPlayer('eng4_not_3', 'دانيال كرولي', 'CAM', 26, 70, 1000000, 20000, 7, 'إنجلترا', 'ENG', 'eng4_notts', 'eng_tier_4'),
    createLowerTierPlayer('eng4_not_4', 'جودي جونز', 'LW', 27, 70, 1100000, 21000, 10, 'مالطا', 'MLT', 'eng4_notts', 'eng_tier_4'),
    createLowerTierPlayer('eng4_not_5', 'ألاسان غاساما', 'ST', 24, 69, 850000, 18000, 9, 'غامبيا', 'GAM', 'eng4_notts', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_wimbledon', 'إيه إف سي ويمبلدون', 'ويمبلدون', 'لندن', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 55, '#1e3a8a', '#eab308', 3500000, 1000000, 440000, 'بلوغلين ستاديوم', 9200, [
    createLowerTierPlayer('eng4_wim_1', 'أوين غودمان', 'GK', 20, 67, 600000, 13000, 1, 'إنجلترا', 'ENG', 'eng4_wimbledon', 'eng_tier_4'),
    createLowerTierPlayer('eng4_wim_2', 'ريان جونسون', 'CB', 27, 67, 480000, 14000, 6, 'أيرلندا الشمالية', 'NIR', 'eng4_wimbledon', 'eng_tier_4'),
    createLowerTierPlayer('eng4_wim_3', 'عمر بوجيل', 'ST', 30, 68, 650000, 17000, 9, 'المغرب', 'MAR', 'eng4_wimbledon', 'eng_tier_4'),
    createLowerTierPlayer('eng4_wim_4', 'ماثيو ستيفنز', 'ST', 26, 68, 700000, 16000, 14, 'إنجلترا', 'ENG', 'eng4_wimbledon', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_chesterfield', 'تشيسترفيلد إف سي', 'تشيسترفيلد', 'تشيسترفيلد', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 54, '#2563eb', '#ffffff', 3400000, 950000, 420000, 'إس إم إتش غروب', 10500, [
    createLowerTierPlayer('eng4_che_1', 'ريان بوتل', 'GK', 29, 66, 400000, 12000, 1, 'إنجلترا', 'ENG', 'eng4_chesterfield', 'eng_tier_4'),
    createLowerTierPlayer('eng4_che_2', 'توم نايلور', 'CDM', 33, 68, 550000, 16000, 4, 'إنجلترا', 'ENG', 'eng4_chesterfield', 'eng_tier_4'),
    createLowerTierPlayer('eng4_che_3', 'أرماندو دوبرا', 'CAM', 23, 69, 900000, 18000, 17, 'ألبانيا', 'ALB', 'eng4_chesterfield', 'eng_tier_4'),
    createLowerTierPlayer('eng4_che_4', 'ويل غريغ السريع', 'ST', 33, 69, 600000, 18000, 9, 'أيرلندا الشمالية', 'NIR', 'eng4_chesterfield', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_port_vale', 'بورت فالي', 'بورت فالي', 'ستوك', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 55, '#ffffff', '#000000', 3500000, 1000000, 430000, 'فالي بارك', 19000, [
    createLowerTierPlayer('eng4_por_1', 'كونور ريبلي', 'GK', 31, 68, 550000, 15000, 1, 'إنجلترا', 'ENG', 'eng4_port_vale', 'eng_tier_4'),
    createLowerTierPlayer('eng4_por_2', 'بين غاريتي', 'CM', 27, 69, 850000, 18000, 8, 'إنجلترا', 'ENG', 'eng4_port_vale', 'eng_tier_4'),
    createLowerTierPlayer('eng4_por_3', 'جايسون باتيتشي', 'ST', 26, 68, 700000, 16000, 9, 'إنجلترا', 'ENG', 'eng4_port_vale', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_doncaster', 'دونكاستر روفرز', 'دونكاستر', 'دونكاستر', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 54, '#dc2626', '#ffffff', 3200000, 900000, 400000, 'إيكوسيرف ستاديوم', 15200, [
    createLowerTierPlayer('eng4_don_1', 'تيدي شيرمان-لو', 'GK', 21, 67, 500000, 12000, 1, 'إنجلترا', 'ENG', 'eng4_doncaster', 'eng_tier_4'),
    createLowerTierPlayer('eng4_don_2', 'لوك موليينوكس', 'RW', 26, 69, 900000, 17000, 7, 'إنجلترا', 'ENG', 'eng4_doncaster', 'eng_tier_4'),
    createLowerTierPlayer('eng4_don_3', 'بيلي شارب الأسطورة', 'ST', 38, 68, 300000, 18000, 10, 'إنجلترا', 'ENG', 'eng4_doncaster', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_gillingham', 'غيلينغهام إف سي', 'غيلينغهام', 'غيلينغهام', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 53, '#2563eb', '#ffffff', 3000000, 850000, 380000, 'بريستفيلد ستاديوم', 11500, [
    createLowerTierPlayer('eng4_gil_1', 'جيك تيرنر', 'GK', 25, 66, 400000, 11000, 1, 'إنجلترا', 'ENG', 'eng4_gillingham', 'eng_tier_4'),
    createLowerTierPlayer('eng4_gil_2', 'ماكس إيهمر', 'CB', 32, 67, 350000, 13000, 5, 'ألمانيا', 'GER', 'eng4_gillingham', 'eng_tier_4'),
    createLowerTierPlayer('eng4_gil_3', 'أوليفير هوكينز', 'ST', 32, 67, 380000, 13000, 9, 'إنجلترا', 'ENG', 'eng4_gillingham', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_salford', 'سالفورد سيتي', 'سالفورد', 'مانشستر', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 53, '#dc2626', '#000000', 3300000, 950000, 420000, 'مور لين ستاديوم', 5100, [
    createLowerTierPlayer('eng4_sal_1', 'جيمي جونز', 'GK', 35, 66, 250000, 12000, 1, 'إنجلترا', 'ENG', 'eng4_salford', 'eng_tier_4'),
    createLowerTierPlayer('eng4_sal_2', 'كيليان كول كول', 'ST', 22, 68, 750000, 15000, 9, 'إنجلترا', 'ENG', 'eng4_salford', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_walsall', 'والسول إف سي', 'والسول', 'والسول', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 53, '#dc2626', '#ffffff', 2900000, 800000, 370000, 'بيسكوت ستاديوم', 11300, [
    createLowerTierPlayer('eng4_wal_1', 'تومي سيمكين', 'GK', 19, 66, 450000, 10000, 1, 'إنجلترا', 'ENG', 'eng4_walsall', 'eng_tier_4'),
    createLowerTierPlayer('eng4_wal_2', 'جاميل مات', 'ST', 34, 67, 300000, 12000, 9, 'جامايكا', 'JAM', 'eng4_walsall', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_carlisle', 'كارلايل يونايتد', 'كارلايل', 'كارلايل', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 54, '#2563eb', '#dc2626', 3100000, 880000, 390000, 'برونتون بارك', 17900, [
    createLowerTierPlayer('eng4_car_1', 'هاري لويس', 'GK', 26, 67, 500000, 13000, 1, 'إنجلترا', 'ENG', 'eng4_carlisle', 'eng_tier_4'),
    createLowerTierPlayer('eng4_car_2', 'تشارلي وايك', 'ST', 31, 69, 700000, 16000, 9, 'إنجلترا', 'ENG', 'eng4_carlisle', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_tranmere', 'ترانمير روفرز', 'ترانمير', 'بيركينهيد', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 53, '#ffffff', '#1e3a8a', 2800000, 780000, 360000, 'برينتون بارك', 16500, [
    createLowerTierPlayer('eng4_tra_1', 'لوك مكغي', 'GK', 28, 66, 400000, 12000, 1, 'إنجلترا', 'ENG', 'eng4_tranmere', 'eng_tier_4'),
    createLowerTierPlayer('eng4_tra_2', 'كونور جينينغز', 'CAM', 32, 68, 500000, 14000, 18, 'إنجلترا', 'ENG', 'eng4_tranmere', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_grimsby', 'غريمسبي تاون', 'غريمسبي', 'كليثوربس', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 52, '#000000', '#ffffff', 2700000, 750000, 350000, 'بلونديل بارك', 9000, [
    createLowerTierPlayer('eng4_gri_1', 'جوردان رايت', 'GK', 25, 65, 350000, 11000, 1, 'إنجلترا', 'ENG', 'eng4_grimsby', 'eng_tier_4'),
    createLowerTierPlayer('eng4_gri_2', 'داني روز', 'ST', 30, 67, 450000, 13000, 9, 'إنجلترا', 'ENG', 'eng4_grimsby', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_crewe', 'كرو ألكساندرا', 'كرو', 'كرو', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 53, '#dc2626', '#ffffff', 2900000, 820000, 370000, 'غريستي رود', 10100, [
    createLowerTierPlayer('eng4_cre_1', 'فيليب مارشال', 'GK', 21, 66, 400000, 10000, 1, 'إنجلترا', 'ENG', 'eng4_crewe', 'eng_tier_4'),
    createLowerTierPlayer('eng4_cre_2', 'ميكي ديميتريو', 'CB', 34, 68, 400000, 14000, 5, 'ويلز', 'WAL', 'eng4_crewe', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_swindon', 'سويندون تاون', 'سويندون', 'سويندون', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 52, '#dc2626', '#ffffff', 2800000, 760000, 360000, 'ذا كاونتي غراوند', 15700, [
    createLowerTierPlayer('eng4_swi_1', 'جاك بينغلي', 'GK', 24, 65, 350000, 11000, 1, 'إنجلترا', 'ENG', 'eng4_swindon', 'eng_tier_4'),
    createLowerTierPlayer('eng4_swi_2', 'بول غلاتزل', 'ST', 23, 67, 550000, 13000, 9, 'ألمانيا', 'GER', 'eng4_swindon', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_fleetwood', 'فليتوود تاون', 'فليتوود', 'فليتوود', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 52, '#dc2626', '#ffffff', 2700000, 740000, 350000, 'هايبري ستاديوم', 5300, [
    createLowerTierPlayer('eng4_fle_1', 'ديفيد هارينغتون', 'GK', 24, 65, 350000, 10000, 1, 'أيرلندا', 'IRL', 'eng4_fleetwood', 'eng_tier_4'),
    createLowerTierPlayer('eng4_fle_2', 'تومي لونيغان', 'ST', 20, 66, 450000, 11000, 9, 'أيرلندا', 'IRL', 'eng4_fleetwood', 'eng_tier_4'),
  ]),

  createLowerTierClub('eng4_accrington', 'أكرينغتون ستانلي', 'أكرينغتون', 'أكرينغتون', 'إنجلترا', 'ENG', 4, 'eng_tier_4', 51, '#dc2626', '#ffffff', 2500000, 700000, 330000, 'وام غراوند', 5400, [
    createLowerTierPlayer('eng4_acc_1', 'مايكل كيلي', 'GK', 27, 65, 300000, 10000, 1, 'أيرلندا', 'IRL', 'eng4_accrington', 'eng_tier_4'),
    createLowerTierPlayer('eng4_acc_2', 'شون والي', 'RW', 36, 66, 250000, 12000, 7, 'إنجلترا', 'ENG', 'eng4_accrington', 'eng_tier_4'),
  ]),
];

// ============================================================================
// 3. SAUDI SECOND DIVISION (sau_tier_3) - 16 CLUBS WITH REAL SAUDI PLAYERS
// ============================================================================
export const SAUDI_TIER_3_CLUBS: Club[] = [
  createLowerTierClub('sau3_hajer', 'نادي هجر السعودي', 'هجر', 'الهفوف', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 58, '#000000', '#ffffff', 4200000, 1800000, 380000, 'ملعب الأمير عبد الله بن جلوي', 19500, [
    createLowerTierPlayer('sau3_haj_1', 'علي المزيدي', 'GK', 31, 67, 300000, 18000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_hajer', 'sau_tier_3'),
    createLowerTierPlayer('sau3_haj_2', 'حمد الحمد', 'CB', 28, 68, 450000, 22000, 4, 'المملكة العربية السعودية', 'SAU', 'sau3_hajer', 'sau_tier_3'),
    createLowerTierPlayer('sau3_haj_3', 'حسن الصندل', 'LB', 26, 66, 320000, 16000, 3, 'المملكة العربية السعودية', 'SAU', 'sau3_hajer', 'sau_tier_3'),
    createLowerTierPlayer('sau3_haj_4', 'عبد الله عثمان الهداف', 'ST', 27, 70, 700000, 28000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_hajer', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_kawkab', 'نادي الكوكب', 'الكوكب', 'الخرج', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 56, '#ea580c', '#2563eb', 3800000, 1600000, 340000, 'ملعب الشعلة بالخرج', 8000, [
    createLowerTierPlayer('sau3_kaw_1', 'يحيى الشهري الشاب', 'GK', 25, 66, 280000, 15000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_kawkab', 'sau_tier_3'),
    createLowerTierPlayer('sau3_kaw_2', 'محمد القرني', 'CM', 29, 68, 500000, 24000, 8, 'المملكة العربية السعودية', 'SAU', 'sau3_kawkab', 'sau_tier_3'),
    createLowerTierPlayer('sau3_kaw_3', 'شاكر الرقيعي', 'ST', 26, 69, 600000, 25000, 11, 'المملكة العربية السعودية', 'SAU', 'sau3_kawkab', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_diriyah', 'نادي الدرعية', 'الدرعية', 'الدرعية', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 57, '#7c3aed', '#ffffff', 4000000, 1700000, 360000, 'ملعب الصايغ بالرياض', 10000, [
    createLowerTierPlayer('sau3_dir_1', 'مشاري القرعاوي', 'GK', 27, 67, 350000, 18000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_diriyah', 'sau_tier_3'),
    createLowerTierPlayer('sau3_dir_2', 'سالم الخيبري', 'ST', 25, 69, 650000, 26000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_diriyah', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_alsadd', 'نادي السد بنعجان', 'السد السعودي', 'نعجان', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 54, '#059669', '#ffffff', 3200000, 1300000, 290000, 'ملعب نادي السد', 4000, [
    createLowerTierPlayer('sau3_sad_1', 'خالد شراحيلي', 'GK', 33, 67, 300000, 18000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_alsadd', 'sau_tier_3'),
    createLowerTierPlayer('sau3_sad_2', 'تركي سفياني', 'ST', 28, 68, 500000, 22000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_alsadd', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_bisha', 'نادي بيشة الرياضي', 'بيشة', 'بيشة', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 55, '#2563eb', '#ffffff', 3400000, 1400000, 310000, 'استاد جامعة بيشة', 6000, [
    createLowerTierPlayer('sau3_bis_1', 'نايف البقعاوي', 'GK', 26, 66, 300000, 16000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_bisha', 'sau_tier_3'),
    createLowerTierPlayer('sau3_bis_2', 'عمر الخضري', 'ST', 27, 68, 550000, 23000, 10, 'المملكة العربية السعودية', 'SAU', 'sau3_bisha', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_taqadom', 'نادي التقدم بمذنب', 'التقدم', 'مذنب', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 53, '#dc2626', '#ffffff', 3000000, 1200000, 270000, 'ملعب نادي التقدم', 4500, [
    createLowerTierPlayer('sau3_taq_1', 'محمد العتيبي', 'GK', 25, 65, 260000, 14000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_taqadom', 'sau_tier_3'),
    createLowerTierPlayer('sau3_taq_2', 'صالح الحارثي', 'ST', 26, 67, 450000, 20000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_taqadom', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_hottain', 'نادي حطين', 'حطين', 'صامطة', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 54, '#059669', '#f59e0b', 3100000, 1250000, 280000, 'ملعب مدينة الملك فيصل الرياضية بجازان', 10000, [
    createLowerTierPlayer('sau3_hot_1', 'متعب شراحيلي', 'GK', 30, 66, 320000, 17000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_hottain', 'sau_tier_3'),
    createLowerTierPlayer('sau3_hot_2', 'موسى مدخلي الهداف', 'ST', 31, 69, 580000, 24000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_hottain', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_qous', 'نادي القوس بالخرمة', 'القوس', 'الخرمة', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 52, '#ea580c', '#000000', 2800000, 1100000, 250000, 'ملعب نادي القوس', 3500, [
    createLowerTierPlayer('sau3_qou_1', 'فهد الدوسري', 'GK', 24, 65, 250000, 14000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_qous', 'sau_tier_3'),
    createLowerTierPlayer('sau3_qou_2', 'سلطان المقاطي', 'ST', 25, 67, 420000, 19000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_qous', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_afif', 'نادي عفيف', 'عفيف', 'عفيف', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 51, '#eab308', '#000000', 2700000, 1050000, 240000, 'ملعب نادي عفيف', 3000, [
    createLowerTierPlayer('sau3_afi_1', 'وليد المطيري', 'GK', 26, 65, 240000, 13000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_afif', 'sau_tier_3'),
    createLowerTierPlayer('sau3_afi_2', 'ماجد العتيبي', 'ST', 27, 66, 400000, 18000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_afif', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_nairyah', 'نادي النعيرية', 'النعيرية', 'النعيرية', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 52, '#2563eb', '#ffffff', 2850000, 1120000, 255000, 'ملعب النعيرية', 4000, [
    createLowerTierPlayer('sau3_nai_1', 'سلطان الغامدي', 'GK', 25, 65, 250000, 14000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_nairyah', 'sau_tier_3'),
    createLowerTierPlayer('sau3_nai_2', 'فهد الهاجري', 'ST', 26, 67, 440000, 19500, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_nairyah', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_rayan', 'نادي الريان بحائل', 'الريان السعودي', 'حائل', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 53, '#dc2626', '#ffffff', 2950000, 1180000, 265000, 'ملعب نادي الريان', 4500, [
    createLowerTierPlayer('sau3_ray_1', 'فيصل الشمري', 'GK', 24, 65, 260000, 14000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_rayan', 'sau_tier_3'),
    createLowerTierPlayer('sau3_ray_2', 'عبد الإله الشمري', 'ST', 25, 67, 460000, 20000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_rayan', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_jerash', 'نادي جرش بأحد رفيدة', 'جرش', 'أحد رفيدة', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 53, '#0284c7', '#ffffff', 3000000, 1200000, 270000, 'ملعب نادي جرش', 5000, [
    createLowerTierPlayer('sau3_jer_1', 'عبد الله القحطاني', 'GK', 26, 66, 290000, 15000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_jerash', 'sau_tier_3'),
    createLowerTierPlayer('sau3_jer_2', 'سعيد الشهراني', 'ST', 27, 68, 520000, 22000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_jerash', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_saqer', 'نادي الصقر بالقصيم', 'الصقر', 'بريدة', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 54, '#eab308', '#dc2626', 3150000, 1280000, 285000, 'ملعب الصقر ببريدة', 5500, [
    createLowerTierPlayer('sau3_saq_1', 'سعود التميمي', 'GK', 27, 66, 310000, 16000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_saqer', 'sau_tier_3'),
    createLowerTierPlayer('sau3_saq_2', 'عبد الله الصالحي', 'ST', 26, 68, 530000, 22500, 10, 'المملكة العربية السعودية', 'SAU', 'sau3_saqer', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_sahel', 'نادي الساحل بعنك', 'الساحل السعودي', 'عنك', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 55, '#eab308', '#2563eb', 3300000, 1350000, 300000, 'ملعب الساحل بالقطيف', 6000, [
    createLowerTierPlayer('sau3_sah_1', 'حسين شيعان', 'GK', 33, 67, 340000, 19000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_sahel', 'sau_tier_3'),
    createLowerTierPlayer('sau3_sah_2', 'هشام آل دبيس', 'ST', 25, 69, 620000, 25000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_sahel', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_washm', 'نادي الوشم بشقراء', 'الوشم', 'شقراء', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 52, '#ffffff', '#dc2626', 2800000, 1100000, 250000, 'ملعب نادي الوشم', 4000, [
    createLowerTierPlayer('sau3_was_1', 'فيصل الدوسري', 'GK', 24, 65, 240000, 13500, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_washm', 'sau_tier_3'),
    createLowerTierPlayer('sau3_was_2', 'عبد العزيز اليوسف', 'ST', 25, 67, 430000, 19000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_washm', 'sau_tier_3'),
  ]),

  createLowerTierClub('sau3_taraji', 'نادي الترجي السعودي', 'الترجي السعودي', 'القطيف', 'المملكة العربية السعودية', 'SAU', 3, 'sau_tier_3', 53, '#dc2626', '#2563eb', 2900000, 1150000, 260000, 'استاد الأمير نايف بن عبد العزيز', 12000, [
    createLowerTierPlayer('sau3_tar_1', 'أحمد كعبي', 'GK', 27, 66, 290000, 15000, 1, 'المملكة العربية السعودية', 'SAU', 'sau3_taraji', 'sau_tier_3'),
    createLowerTierPlayer('sau3_tar_2', 'محمد الحارثي', 'ST', 26, 68, 510000, 22000, 9, 'المملكة العربية السعودية', 'SAU', 'sau3_taraji', 'sau_tier_3'),
  ]),
];

// ============================================================================
// 4. SAUDI THIRD DIVISION (sau_tier_4) - 14 CLUBS WITH REAL SAUDI PLAYERS
// ============================================================================
export const SAUDI_TIER_4_CLUBS: Club[] = [
  createLowerTierClub('sau4_hilaliyah', 'نادي الهلالية', 'الهلالية', 'البكيرية', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 45, '#1e3a8a', '#ffffff', 1800000, 650000, 160000, 'ملعب نادي الهلالية', 3000, [
    createLowerTierPlayer('sau4_hil_1', 'عبد الله السالم', 'GK', 23, 62, 120000, 8000, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_hilaliyah', 'sau_tier_4'),
    createLowerTierPlayer('sau4_hil_2', 'حمد الراجحي', 'ST', 24, 64, 210000, 11000, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_hilaliyah', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_dhahab', 'نادي الذهب بمهد الذهب', 'الذهب', 'مهد الذهب', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 44, '#eab308', '#000000', 1600000, 580000, 145000, 'ملعب نادي الذهب', 2500, [
    createLowerTierPlayer('sau4_dha_1', 'سلطان المطيري', 'GK', 24, 61, 100000, 7500, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_dhahab', 'sau_tier_4'),
    createLowerTierPlayer('sau4_dha_2', 'محمد الميموني', 'ST', 25, 63, 180000, 10000, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_dhahab', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_tabarjal', 'نادي طبرجل الرياضي', 'طبرجل', 'الجوف', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 43, '#2563eb', '#ffffff', 1500000, 540000, 135000, 'ملعب نادي طبرجل', 2500, [
    createLowerTierPlayer('sau4_tab_1', 'فهد الشراري', 'GK', 23, 61, 95000, 7000, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_tabarjal', 'sau_tier_4'),
    createLowerTierPlayer('sau4_tab_2', 'نايف الضويحي', 'ST', 24, 63, 170000, 9500, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_tabarjal', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_qaryat', 'نادي قرية العليا', 'قرية العليا', 'قرية العليا', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 42, '#059669', '#ffffff', 1450000, 520000, 130000, 'ملعب نادي قرية العليا', 2000, [
    createLowerTierPlayer('sau4_qar_1', 'خالد المطيري', 'GK', 22, 60, 90000, 6800, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_qaryat', 'sau_tier_4'),
    createLowerTierPlayer('sau4_qar_2', 'سالم المري', 'ST', 24, 63, 175000, 9800, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_qaryat', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_sharurah', 'نادي شرورة الرياضي', 'شرورة', 'شرورة', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 43, '#ea580c', '#000000', 1500000, 550000, 138000, 'ملعب نادي شرورة', 3000, [
    createLowerTierPlayer('sau4_sha_1', 'أحمد الصيعري', 'GK', 25, 61, 105000, 7500, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_sharurah', 'sau_tier_4'),
    createLowerTierPlayer('sau4_sha_2', 'مبروك الصيعري', 'ST', 26, 64, 200000, 11000, 10, 'المملكة العربية السعودية', 'SAU', 'sau4_sharurah', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_alfaw', 'نادي الفاو بالسليل', 'الفاو', 'السليل', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 41, '#dc2626', '#ffffff', 1350000, 480000, 120000, 'ملعب الفاو بالسليل', 2000, [
    createLowerTierPlayer('sau4_faw_1', 'مبارك الدوسري', 'GK', 23, 60, 85000, 6500, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_alfaw', 'sau_tier_4'),
    createLowerTierPlayer('sau4_faw_2', 'محمد الخضير', 'ST', 24, 62, 150000, 9000, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_alfaw', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_nakheel', 'نادي النخل بينبع', 'النخل', 'ينبع النخل', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 42, '#15803d', '#ffffff', 1400000, 500000, 125000, 'ملعب النخل بينبع', 2500, [
    createLowerTierPlayer('sau4_nak_1', 'عبد العزيز الجهني', 'GK', 24, 61, 95000, 7200, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_nakheel', 'sau_tier_4'),
    createLowerTierPlayer('sau4_nak_2', 'وليد الرفاعي', 'ST', 25, 63, 170000, 9600, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_nakheel', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_munif', 'نادي منيف بتربة', 'منيف', 'تربة', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 41, '#7c3aed', '#ffffff', 1300000, 460000, 115000, 'ملعب نادي منيف', 2000, [
    createLowerTierPlayer('sau4_mun_1', 'سعد البقمي', 'GK', 22, 60, 80000, 6200, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_munif', 'sau_tier_4'),
    createLowerTierPlayer('sau4_mun_2', 'فيصل الرياحي', 'ST', 24, 62, 155000, 9200, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_munif', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_hubuna', 'نادي حبونا بنجران', 'حبونا', 'حبونا', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 42, '#2563eb', '#f59e0b', 1420000, 510000, 128000, 'ملعب حبونا بنجران', 2500, [
    createLowerTierPlayer('sau4_hub_1', 'علي آل سليم', 'GK', 24, 61, 95000, 7100, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_hubuna', 'sau_tier_4'),
    createLowerTierPlayer('sau4_hub_2', 'حسين آل دويس', 'ST', 25, 63, 175000, 9900, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_hubuna', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_intilaq', 'نادي الانطلاق بالجوف', 'الانطلاق', 'قارا', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 40, '#0284c7', '#ffffff', 1250000, 440000, 110000, 'ملعب نادي الانطلاق', 2000, [
    createLowerTierPlayer('sau4_int_1', 'عبد الرحمن الرويلي', 'GK', 23, 60, 80000, 6000, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_intilaq', 'sau_tier_4'),
    createLowerTierPlayer('sau4_int_2', 'يوسف القعقاع', 'ST', 24, 62, 145000, 8800, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_intilaq', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_ghotah', 'نادي الغوطة بحائل', 'الغوطة', 'موقق', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 41, '#dc2626', '#000000', 1320000, 470000, 118000, 'ملعب نادي الغوطة', 2200, [
    createLowerTierPlayer('sau4_gho_1', 'سعود التميمي الشاب', 'GK', 22, 60, 82000, 6300, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_ghotah', 'sau_tier_4'),
    createLowerTierPlayer('sau4_gho_2', 'بدر الشمري', 'ST', 24, 62, 150000, 9100, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_ghotah', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_khaldi', 'نادي الخالدي بالوجه', 'الخالدي', 'الوجه', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 40, '#eab308', '#2563eb', 1280000, 450000, 112000, 'ملعب نادي الخالدي', 2000, [
    createLowerTierPlayer('sau4_kha_1', 'سامي الحويطي', 'GK', 23, 60, 78000, 6000, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_khaldi', 'sau_tier_4'),
    createLowerTierPlayer('sau4_kha_2', 'عبد الله البلوي', 'ST', 24, 62, 148000, 8900, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_khaldi', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_tahami', 'نادي التهامي بجازان', 'التهامي', 'جازان', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 42, '#ea580c', '#ffffff', 1380000, 490000, 122000, 'ملعب مدينة الملك فيصل الرديف', 3000, [
    createLowerTierPlayer('sau4_tah_1', 'حسن حكمي', 'GK', 24, 61, 90000, 6900, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_tahami', 'sau_tier_4'),
    createLowerTierPlayer('sau4_tah_2', 'إبراهيم يحيى', 'ST', 25, 63, 168000, 9500, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_tahami', 'sau_tier_4'),
  ]),

  createLowerTierClub('sau4_qilwah', 'نادي قلوة بالباحة', 'قلوة', 'قلوة', 'المملكة العربية السعودية', 'SAU', 4, 'sau_tier_4', 41, '#059669', '#eab308', 1310000, 465000, 116000, 'ملعب نادي قلوة', 2200, [
    createLowerTierPlayer('sau4_qil_1', 'أحمد الزهراني', 'GK', 23, 60, 83000, 6400, 1, 'المملكة العربية السعودية', 'SAU', 'sau4_qilwah', 'sau_tier_4'),
    createLowerTierPlayer('sau4_qil_2', 'محمد الغامدي الشاب', 'ST', 24, 62, 152000, 9200, 9, 'المملكة العربية السعودية', 'SAU', 'sau4_qilwah', 'sau_tier_4'),
  ]),
];

// ============================================================================
// 5. SPANISH PRIMERA FEDERACIÓN (esp_tier_3) - 16 CLUBS WITH REAL PLAYERS
// ============================================================================
export const SPAIN_TIER_3_CLUBS: Club[] = [
  createLowerTierClub('esp3_deportivo', 'ديبورتيفو لاكورونيا', 'ديبورتيفو', 'لاكورونيا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 69, '#2563eb', '#ffffff', 12000000, 5000000, 1100000, 'ريازور', 32600, [
    createLowerTierPlayer('esp3_dep_1', 'جيرمان بارينو', 'GK', 31, 72, 800000, 30000, 1, 'إسبانيا', 'ESP', 'esp3_deportivo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_dep_2', 'بابلو فاسكيز', 'CB', 30, 73, 1200000, 35000, 5, 'إسبانيا', 'ESP', 'esp3_deportivo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_dep_3', 'دييغو فيلالبارينا', 'CM', 23, 74, 2500000, 45000, 8, 'إسبانيا', 'ESP', 'esp3_deportivo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_dep_4', 'لوكاس بيريز الأسطورة', 'ST', 36, 76, 1800000, 60000, 7, 'إسبانيا', 'ESP', 'esp3_deportivo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_dep_5', 'دافيد ميلا', 'LW', 19, 74, 3500000, 40000, 17, 'إسبانيا', 'ESP', 'esp3_deportivo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_dep_6', 'يريمي هيرنانديز', 'RW', 21, 75, 4000000, 48000, 10, 'إسبانيا', 'ESP', 'esp3_deportivo', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_malaga', 'نادي مالقا إف سي', 'مالقا', 'مالقا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 68, '#0284c7', '#ffffff', 10500000, 4500000, 1000000, 'لاروساليدا', 30044, [
    createLowerTierPlayer('esp3_mal_1', 'ألفونسو هيريرو', 'GK', 30, 73, 1100000, 32000, 1, 'إسبانيا', 'ESP', 'esp3_malaga', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mal_2', 'نيلسون مونتي', 'CB', 29, 72, 1000000, 30000, 20, 'البرتغال', 'POR', 'esp3_malaga', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mal_3', 'كيفين ميدينا', 'LW', 24, 73, 1800000, 35000, 11, 'إسبانيا', 'ESP', 'esp3_malaga', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mal_4', 'أنطونيو كورديرو الصاعد', 'RW', 18, 73, 3000000, 30000, 26, 'إسبانيا', 'ESP', 'esp3_malaga', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mal_5', 'داني سيبولفيدا', 'ST', 26, 72, 1400000, 32000, 9, 'إسبانيا', 'ESP', 'esp3_malaga', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_recreativo', 'ريكرياتيفو دي أويلفا', 'ريكرياتيفو', 'أويلفا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 64, '#1d4ed8', '#ffffff', 5500000, 2000000, 600000, 'نويفو كولومبينو', 21600, [
    createLowerTierPlayer('esp3_rec_1', 'روبين غالفيز', 'GK', 31, 70, 600000, 22000, 1, 'إسبانيا', 'ESP', 'esp3_recreativo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_rec_2', 'تشي تشي', 'ST', 30, 71, 900000, 25000, 9, 'إسبانيا', 'ESP', 'esp3_recreativo', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_murcia', 'ريال مورسيا', 'مورسيا', 'مورسيا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 65, '#dc2626', '#ffffff', 6500000, 2400000, 700000, 'إنريكي روكا دي مورسيا', 31179, [
    createLowerTierPlayer('esp3_mur_1', 'جيانفرانكو غازانيغا', 'GK', 30, 71, 800000, 25000, 1, 'الأرجنتين', 'ARG', 'esp3_murcia', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mur_2', 'بيدرو ليون النجم', 'RW', 37, 72, 700000, 35000, 14, 'إسبانيا', 'ESP', 'esp3_murcia', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mur_3', 'كارلوس روخاس', 'ST', 22, 71, 1200000, 24000, 9, 'إسبانيا', 'ESP', 'esp3_murcia', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_ponferradina', 'إس دي بونفيرادينا', 'بونفيرادينا', 'بونفيرادا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 64, '#2563eb', '#ffffff', 5800000, 2100000, 650000, 'إل تورالين', 8400, [
    createLowerTierPlayer('esp3_pon_1', 'أندريس برييتو', 'GK', 30, 71, 750000, 24000, 1, 'إسبانيا', 'ESP', 'esp3_ponferradina', 'esp_tier_3'),
    createLowerTierPlayer('esp3_pon_2', 'بورخا فايي', 'CAM', 32, 72, 900000, 28000, 10, 'إسبانيا', 'ESP', 'esp3_ponferradina', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_cultural', 'كولتورال ليونيسا', 'ليونيسا', 'ليون', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 64, '#ffffff', '#dc2626', 6000000, 2200000, 680000, 'رينو دي ليون', 13500, [
    createLowerTierPlayer('esp3_cul_1', 'ميغيل بانيوس', 'GK', 28, 71, 850000, 24000, 1, 'إسبانيا', 'ESP', 'esp3_cultural', 'esp_tier_3'),
    createLowerTierPlayer('esp3_cul_2', 'لويس تشاكون', 'ST', 24, 72, 1500000, 28000, 11, 'إسبانيا', 'ESP', 'esp3_cultural', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_hercules', 'إيركوليس أليكانتي', 'إيركوليس', 'أليكانتي', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 63, '#1d4ed8', '#ffffff', 5400000, 1900000, 600000, 'خوسيه ريكو بيريز', 29500, [
    createLowerTierPlayer('esp3_her_1', 'كارلوس أباد', 'GK', 29, 70, 700000, 22000, 1, 'إسبانيا', 'ESP', 'esp3_hercules', 'esp_tier_3'),
    createLowerTierPlayer('esp3_her_2', 'أوريول سولديبيلا', 'RW', 23, 72, 1400000, 26000, 7, 'إسبانيا', 'ESP', 'esp3_hercules', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_nastic', 'خيمناستيك دي طركونة', 'خيمناستيك', 'طركونة', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 63, '#dc2626', '#ffffff', 5200000, 1800000, 580000, 'نو إستادي كوستا دورادا', 14500, [
    createLowerTierPlayer('esp3_nas_1', 'ألبرتو فارو', 'GK', 31, 70, 650000, 21000, 1, 'إسبانيا', 'ESP', 'esp3_nastic', 'esp_tier_3'),
    createLowerTierPlayer('esp3_nas_2', 'بابلو فرنانديز', 'ST', 26, 71, 1100000, 25000, 9, 'إسبانيا', 'ESP', 'esp3_nastic', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_lugo', 'سي دي لوغو', 'لوغو', 'لوغو', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 62, '#dc2626', '#2563eb', 4800000, 1700000, 550000, 'أنخيل كارو', 7800, [
    createLowerTierPlayer('esp3_lug_1', 'ماركوس لافين', 'GK', 28, 69, 550000, 19000, 1, 'إسبانيا', 'ESP', 'esp3_lugo', 'esp_tier_3'),
    createLowerTierPlayer('esp3_lug_2', 'برايان ميندوزا', 'ST', 25, 70, 950000, 23000, 9, 'المكسيك', 'MEX', 'esp3_lugo', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_ibiza', 'يو دي إيبيزا', 'إيبيزا', 'إيبيزا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 64, '#0284c7', '#ffffff', 6200000, 2300000, 690000, 'كان ميسيس', 6500, [
    createLowerTierPlayer('esp3_ibi_1', 'رامون خوان', 'GK', 24, 71, 1000000, 24000, 1, 'إسبانيا', 'ESP', 'esp3_ibiza', 'esp_tier_3'),
    createLowerTierPlayer('esp3_ibi_2', 'أليكس غالار', 'LW', 32, 72, 1100000, 29000, 11, 'إسبانيا', 'ESP', 'esp3_ibiza', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_alcorcon', 'إيه دي ألكوركون', 'ألكوركون', 'مدريد', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 63, '#eab308', '#2563eb', 5300000, 1850000, 590000, 'سانتو دومينغو', 5100, [
    createLowerTierPlayer('esp3_alc_1', 'خيسوس أبيراريو', 'GK', 29, 70, 700000, 21000, 1, 'إسبانيا', 'ESP', 'esp3_alcorcon', 'esp_tier_3'),
    createLowerTierPlayer('esp3_alc_2', 'دافيد نافارو', 'CB', 24, 71, 1200000, 23000, 4, 'إسبانيا', 'ESP', 'esp3_alcorcon', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_antequera', 'أنتيغويرا سي إف', 'أنتيغويرا', 'أنتيغويرا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 61, '#15803d', '#ffffff', 4200000, 1400000, 480000, 'إل ماولي', 7500, [
    createLowerTierPlayer('esp3_ant_1', 'إيفان مارتينيز', 'GK', 22, 69, 650000, 18000, 1, 'إسبانيا', 'ESP', 'esp3_antequera', 'esp_tier_3'),
    createLowerTierPlayer('esp3_ant_2', 'لويس أريولانو', 'ST', 26, 70, 950000, 22000, 9, 'إسبانيا', 'ESP', 'esp3_antequera', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_alcoyano', 'سي دي ألكويانو', 'ألكويانو', 'ألكوي', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 60, '#2563eb', '#ffffff', 3900000, 1300000, 450000, 'إل كولاو', 4850, [
    createLowerTierPlayer('esp3_aly_1', 'مانو غارسيا', 'GK', 33, 69, 500000, 18000, 1, 'إسبانيا', 'ESP', 'esp3_alcoyano', 'esp_tier_3'),
    createLowerTierPlayer('esp3_aly_2', 'ماريو لوسادا', 'ST', 27, 70, 900000, 22000, 9, 'إسبانيا', 'ESP', 'esp3_alcoyano', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_merida', 'إيه دي ميريدا', 'ميريدا', 'ميريدا', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 60, '#000000', '#ffffff', 3800000, 1250000, 440000, 'رومانو خوسيه فوتشيه', 14600, [
    createLowerTierPlayer('esp3_mer_1', 'خوان باولو', 'GK', 26, 68, 550000, 17000, 1, 'إسبانيا', 'ESP', 'esp3_merida', 'esp_tier_3'),
    createLowerTierPlayer('esp3_mer_2', 'داني ميندوزا', 'ST', 25, 70, 920000, 21000, 9, 'إسبانيا', 'ESP', 'esp3_merida', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_linares', 'ليناريس ديبورتيفو', 'ليناريس', 'ليناريس', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 59, '#2563eb', '#ffffff', 3600000, 1200000, 420000, 'ليناريخوس', 10000, [
    createLowerTierPlayer('esp3_lin_1', 'إرنستاس جوتاس', 'GK', 25, 68, 500000, 16000, 1, 'ليتوانيا', 'LTU', 'esp3_linares', 'esp_tier_3'),
    createLowerTierPlayer('esp3_lin_2', 'هوغو دياز', 'ST', 36, 69, 400000, 19000, 9, 'إسبانيا', 'ESP', 'esp3_linares', 'esp_tier_3'),
  ]),

  createLowerTierClub('esp3_real_union', 'ريال يونيون دي إيرون', 'ريال يونيون', 'إيرون', 'إسبانيا', 'ESP', 3, 'esp_tier_3', 60, '#000000', '#ffffff', 4000000, 1350000, 460000, 'ستاديوم غال', 5000, [
    createLowerTierPlayer('esp3_uni_1', 'جيمس رايت', 'GK', 23, 68, 550000, 17000, 1, 'إنجلترا', 'ENG', 'esp3_real_union', 'esp_tier_3'),
    createLowerTierPlayer('esp3_uni_2', 'ألبرتو سانشيز', 'ST', 26, 70, 950000, 22000, 9, 'إسبانيا', 'ESP', 'esp3_real_union', 'esp_tier_3'),
  ]),
];

// ============================================================================
// 6. GERMAN 2. BUNDESLIGA (ger_tier_2) - 14 CLUBS WITH REAL PLAYERS
// ============================================================================
export const GERMANY_TIER_2_CLUBS: Club[] = [
  createLowerTierClub('ger2_hamburg', 'هامبورغ إس في', 'هامبورغ', 'هامبورغ', 'ألمانيا', 'GER', 2, 'ger_tier_2', 76, '#0284c7', '#ffffff', 28000000, 12000000, 2200000, 'فولكسبارك شتاديون', 57000, [
    createLowerTierPlayer('ger2_ham_1', 'دانييل هوير فيرنانديز', 'GK', 31, 75, 2000000, 55000, 1, 'البرتغال', 'POR', 'ger2_hamburg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_ham_2', 'سيباستيان شونلاو', 'CB', 30, 75, 2200000, 60000, 4, 'ألمانيا', 'GER', 'ger2_hamburg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_ham_3', 'لودوفيت ريس', 'CM', 24, 77, 6000000, 80000, 14, 'هولندا', 'NED', 'ger2_hamburg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_ham_4', 'روبيرت غلاتزل الهداف', 'ST', 30, 77, 4500000, 85000, 9, 'ألمانيا', 'GER', 'ger2_hamburg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_ham_5', 'جان لوك دومبي', 'LW', 29, 74, 2500000, 60000, 27, 'فرنسا', 'FRA', 'ger2_hamburg', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_schalke', 'إف سي شالكه 04', 'شالكه', 'غيلسنكيرشن', 'ألمانيا', 'GER', 2, 'ger_tier_2', 75, '#1e3a8a', '#ffffff', 24000000, 10000000, 2000000, 'فيلتينس أرينا', 62271, [
    createLowerTierPlayer('ger2_sch_1', 'جاستن هيكيرين', 'GK', 23, 73, 1800000, 45000, 1, 'ألمانيا', 'GER', 'ger2_schalke', 'ger_tier_2'),
    createLowerTierPlayer('ger2_sch_2', 'مارسين كامينسكي', 'CB', 32, 74, 1500000, 50000, 35, 'بولندا', 'POL', 'ger2_schalke', 'ger_tier_2'),
    createLowerTierPlayer('ger2_sch_3', 'بول سيغوين', 'CM', 29, 75, 2800000, 65000, 7, 'ألمانيا', 'GER', 'ger2_schalke', 'ger_tier_2'),
    createLowerTierPlayer('ger2_sch_4', 'كينان كرامان القائد', 'ST', 30, 76, 3500000, 75000, 19, 'تركيا', 'TUR', 'ger2_schalke', 'ger_tier_2'),
    createLowerTierPlayer('ger2_sch_5', 'موسى سيلا', 'ST', 24, 76, 4500000, 70000, 11, 'مالي', 'MLI', 'ger2_schalke', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_hertha', 'هيرتا برلين', 'هيرتا برلين', 'برلين', 'ألمانيا', 'GER', 2, 'ger_tier_2', 74, '#2563eb', '#ffffff', 22000000, 9500000, 1900000, 'الملعب الأولمبي ببرلين', 74475, [
    createLowerTierPlayer('ger2_her_1', 'تياك إرنست', 'GK', 21, 74, 3000000, 50000, 1, 'ألمانيا', 'GER', 'ger2_hertha', 'ger_tier_2'),
    createLowerTierPlayer('ger2_her_2', 'توني لستنر', 'CB', 34, 73, 1200000, 48000, 37, 'ألمانيا', 'GER', 'ger2_hertha', 'ger_tier_2'),
    createLowerTierPlayer('ger2_her_3', 'مايكل كويزانس', 'CAM', 25, 75, 4000000, 65000, 10, 'فرنسا', 'FRA', 'ger2_hertha', 'ger_tier_2'),
    createLowerTierPlayer('ger2_her_4', 'فلوريان نيديرليشنر', 'ST', 33, 74, 1600000, 55000, 7, 'ألمانيا', 'GER', 'ger2_hertha', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_koln', 'إف سي كولن', 'كولن', 'كولونيا', 'ألمانيا', 'GER', 2, 'ger_tier_2', 75, '#dc2626', '#ffffff', 25000000, 11000000, 2100000, 'راين إنرجي شتاديون', 50000, [
    createLowerTierPlayer('ger2_kol_1', 'يوناس أوربيغ الواعد', 'GK', 21, 75, 4500000, 55000, 1, 'ألمانيا', 'GER', 'ger2_koln', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kol_2', 'تيمو هوبيرز', 'CB', 28, 76, 4000000, 70000, 4, 'ألمانيا', 'GER', 'ger2_koln', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kol_3', 'إريك مارتيل', 'CDM', 22, 76, 6000000, 65000, 6, 'ألمانيا', 'GER', 'ger2_koln', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kol_4', 'ديان ليوبيتشيتش', 'CM', 26, 76, 5000000, 70000, 7, 'النمسا', 'AUT', 'ger2_koln', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kol_5', 'تيم ليمبرلي', 'ST', 22, 75, 3800000, 55000, 19, 'ألمانيا', 'GER', 'ger2_koln', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_dusseldorf', 'فورتونا دوسلدورف', 'دوسلدورف', 'دوسلدورف', 'ألمانيا', 'GER', 2, 'ger_tier_2', 73, '#dc2626', '#ffffff', 18000000, 7500000, 1600000, 'مركور شبيل أرينا', 54600, [
    createLowerTierPlayer('ger2_dus_1', 'فلوريان كاستينماير', 'GK', 27, 74, 2500000, 50000, 1, 'ألمانيا', 'GER', 'ger2_dusseldorf', 'ger_tier_2'),
    createLowerTierPlayer('ger2_dus_2', 'أندريه هوفمان', 'CB', 31, 74, 1800000, 50000, 3, 'ألمانيا', 'GER', 'ger2_dusseldorf', 'ger_tier_2'),
    createLowerTierPlayer('ger2_dus_3', 'إيساك برغمان يوهانيسون', 'CM', 21, 76, 5500000, 60000, 8, 'آيسلندا', 'ISL', 'ger2_dusseldorf', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_hannover', 'هانوفر 96', 'هانوفر', 'هانوفر', 'ألمانيا', 'GER', 2, 'ger_tier_2', 72, '#15803d', '#ffffff', 16000000, 6500000, 1450000, 'هاينز فون هايدن أرينا', 49000, [
    createLowerTierPlayer('ger2_han_1', 'رون روبرت زيلر الأسطورة', 'GK', 35, 74, 1200000, 55000, 1, 'ألمانيا', 'GER', 'ger2_hannover', 'ger_tier_2'),
    createLowerTierPlayer('ger2_han_2', 'مارسيل هالستنبرغ', 'CB', 32, 75, 2200000, 65000, 23, 'ألمانيا', 'GER', 'ger2_hannover', 'ger_tier_2'),
    createLowerTierPlayer('ger2_han_3', 'نيكولو تريسولدي', 'ST', 20, 74, 4500000, 50000, 9, 'ألمانيا', 'GER', 'ger2_hannover', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_kaiserslautern', 'إف سي كايزرسلاوترن', 'كايزرسلاوترن', 'كايزرسلاوترن', 'ألمانيا', 'GER', 2, 'ger_tier_2', 71, '#dc2626', '#ffffff', 14000000, 5500000, 1300000, 'فريتز فالتر شتاديون', 49850, [
    createLowerTierPlayer('ger2_kai_1', 'جوليان كراهل', 'GK', 24, 73, 2000000, 45000, 1, 'ألمانيا', 'GER', 'ger2_kaiserslautern', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kai_2', 'بوريس تومياك', 'CB', 26, 74, 2500000, 52000, 2, 'ألمانيا', 'GER', 'ger2_kaiserslautern', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kai_3', 'راغنار أتشي', 'ST', 26, 75, 4000000, 65000, 9, 'ألمانيا', 'GER', 'ger2_kaiserslautern', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_nurnberg', 'إف سي نورنبرغ', 'نورنبرغ', 'نورنبرغ', 'ألمانيا', 'GER', 2, 'ger_tier_2', 70, '#991b1b', '#ffffff', 13000000, 5000000, 1200000, 'ماكس مورلوك شتاديون', 50000, [
    createLowerTierPlayer('ger2_nur_1', 'يان ريشيرت', 'GK', 23, 72, 1600000, 38000, 1, 'ألمانيا', 'GER', 'ger2_nurnberg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_nur_2', 'روبين كنوخه', 'CB', 32, 74, 2000000, 55000, 31, 'ألمانيا', 'GER', 'ger2_nurnberg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_nur_3', 'ستيفانوس تسوماس', 'ST', 22, 74, 3800000, 52000, 9, 'اليونان', 'GRE', 'ger2_nurnberg', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_darmstadt', 'إس في دارمتشتات 98', 'دارمتشتات', 'دارمتشتات', 'ألمانيا', 'GER', 2, 'ger_tier_2', 71, '#2563eb', '#ffffff', 14500000, 5800000, 1350000, 'ميرك شتاديون', 17800, [
    createLowerTierPlayer('ger2_dar_1', 'مارسيل شوهين', 'GK', 31, 73, 1700000, 48000, 1, 'ألمانيا', 'GER', 'ger2_darmstadt', 'ger_tier_2'),
    createLowerTierPlayer('ger2_dar_2', 'إيزاك ليدبيرغ الهداف', 'ST', 26, 75, 3500000, 60000, 7, 'السويد', 'SWE', 'ger2_darmstadt', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_paderborn', 'إس سي بادربورن 07', 'بادربورن', 'بادربورن', 'ألمانيا', 'GER', 2, 'ger_tier_2', 70, '#1d4ed8', '#000000', 1250000, 4800000, 1150000, 'هوم ديلوكس أرينا', 15000, [
    createLowerTierPlayer('ger2_pad_1', 'بيلي بويتفيلر', 'GK', 25, 72, 1500000, 36000, 1, 'هولندا', 'NED', 'ger2_paderborn', 'ger_tier_2'),
    createLowerTierPlayer('ger2_pad_2', 'أدريانو غريمالدي', 'ST', 33, 72, 1200000, 42000, 39, 'ألمانيا', 'GER', 'ger2_paderborn', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_karlsruhe', 'كارلسروه إس سي', 'كارلسروه', 'كارلسروه', 'ألمانيا', 'GER', 2, 'ger_tier_2', 71, '#2563eb', '#ffffff', 13500000, 5200000, 1250000, 'بي بي في شتاديون', 34300, [
    createLowerTierPlayer('ger2_kar_1', 'ماكس فايس', 'GK', 20, 73, 2500000, 42000, 1, 'ألمانيا', 'GER', 'ger2_karlsruhe', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kar_2', 'مارفين فانيتزيك النجم', 'CM', 31, 76, 3200000, 68000, 10, 'ألمانيا', 'GER', 'ger2_karlsruhe', 'ger_tier_2'),
    createLowerTierPlayer('ger2_kar_3', 'بودو زيفزيفادزه', 'ST', 30, 75, 3000000, 62000, 11, 'جورجيا', 'GEO', 'ger2_karlsruhe', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_furth', 'غرويتر فورت', 'فورت', 'فورت', 'ألمانيا', 'GER', 2, 'ger_tier_2', 69, '#15803d', '#ffffff', 11500000, 4400000, 1050000, 'شتاديون أم لوروير بيرغ', 16600, [
    createLowerTierPlayer('ger2_fur_1', 'ناهويل نول', 'GK', 21, 72, 1700000, 35000, 1, 'ألمانيا', 'GER', 'ger2_furth', 'ger_tier_2'),
    createLowerTierPlayer('ger2_fur_2', 'برانيمير هرغوتا القائد', 'ST', 31, 75, 2800000, 60000, 10, 'السويد', 'SWE', 'ger2_furth', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_magdeburg', '1. إف سي ماغديبورغ', 'ماغديبورغ', 'ماغديبورغ', 'ألمانيا', 'GER', 2, 'ger_tier_2', 69, '#1e3a8a', '#ffffff', 11000000, 4200000, 1000000, 'إم دي سي سي أرينا', 30000, [
    createLowerTierPlayer('ger2_mag_1', 'دومينيك رايمان', 'GK', 27, 72, 1600000, 38000, 1, 'ألمانيا', 'GER', 'ger2_magdeburg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_mag_2', 'باريس أتيك', 'CAM', 29, 74, 2500000, 54000, 23, 'تركيا', 'TUR', 'ger2_magdeburg', 'ger_tier_2'),
    createLowerTierPlayer('ger2_mag_3', 'مارتين كاارس', 'ST', 27, 74, 2800000, 56000, 9, 'هولندا', 'NED', 'ger2_magdeburg', 'ger_tier_2'),
  ]),

  createLowerTierClub('ger2_braunschweig', 'أينتراخت براونشفايغ', 'براونشفايغ', 'براونشفايغ', 'ألمانيا', 'GER', 2, 'ger_tier_2', 68, '#eab308', '#1e3a8a', 10000000, 3800000, 920000, 'أينتراخت شتاديون', 23300, [
    createLowerTierPlayer('ger2_bra_1', 'ماركو يوهانسون', 'GK', 25, 71, 1300000, 32000, 1, 'السويد', 'SWE', 'ger2_braunschweig', 'ger_tier_2'),
    createLowerTierPlayer('ger2_bra_2', 'ريان فيليب', 'ST', 24, 73, 2400000, 48000, 9, 'فرنسا', 'FRA', 'ger2_braunschweig', 'ger_tier_2'),
  ]),
];

// ============================================================================
// 7. ITALIAN SERIE B (ita_tier_2) - 14 CLUBS WITH REAL PLAYERS
// ============================================================================
export const ITALY_SERIE_B_CLUBS: Club[] = [
  createLowerTierClub('ita2_sampdoria', 'يو سي سامبدوريا', 'سامبدوريا', 'جنوة', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 75, '#1e3a8a', '#ffffff', 22000000, 9000000, 1900000, 'لويجي فيراريس', 36599, [
    createLowerTierPlayer('ita2_sam_1', 'ماركو سيلفيستري', 'GK', 33, 76, 2500000, 65000, 1, 'إيطاليا', 'ITA', 'ita2_sampdoria', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sam_2', 'بارتوش بيريشينسكي', 'RB', 32, 74, 2000000, 55000, 24, 'بولندا', 'POL', 'ita2_sampdoria', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sam_3', 'أليكس فيراري', 'CB', 30, 73, 1800000, 50000, 25, 'إيطاليا', 'ITA', 'ita2_sampdoria', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sam_4', 'ماتيو ريتشي', 'CM', 30, 74, 2200000, 58000, 8, 'إيطاليا', 'ITA', 'ita2_sampdoria', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sam_5', 'ماسيمو كودا الهداف', 'ST', 35, 76, 2000000, 70000, 9, 'إيطاليا', 'ITA', 'ita2_sampdoria', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sam_6', 'جينارو توتينو', 'ST', 27, 76, 5000000, 75000, 11, 'إيطاليا', 'ITA', 'ita2_sampdoria', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_sassuolo', 'يو إس ساسولو كالتشيو', 'ساسولو', 'ساسولو', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 77, '#15803d', '#000000', 32000000, 15000000, 2500000, 'مابي ستاديوم', 21584, [
    createLowerTierPlayer('ita2_sas_1', 'جياكومو ساتالينو', 'GK', 25, 73, 1800000, 42000, 1, 'إيطاليا', 'ITA', 'ita2_sassuolo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sas_2', 'جيريمي تولجان', 'RB', 30, 76, 4000000, 75000, 22, 'ألمانيا', 'GER', 'ita2_sassuolo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sas_3', 'دانييل بولوكا', 'CM', 25, 76, 6000000, 70000, 24, 'رومانيا', 'ROU', 'ita2_sassuolo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sas_4', 'كريستيان ثورستفيدت', 'CAM', 25, 77, 8000000, 85000, 42, 'النرويج', 'NOR', 'ita2_sassuolo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sas_5', 'دومينيكو بيراردي الساحر', 'RW', 30, 82, 18000000, 150000, 10, 'إيطاليا', 'ITA', 'ita2_sassuolo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sas_6', 'أرماند لورينتي', 'LW', 25, 78, 11000000, 95000, 45, 'فرنسا', 'FRA', 'ita2_sassuolo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sas_7', 'سامويلي مولاتيري', 'ST', 23, 75, 4500000, 60000, 9, 'إيطاليا', 'ITA', 'ita2_sassuolo', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_palermo', 'باليرمو إف سي', 'باليرمو', 'باليرمو', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 74, '#f472b6', '#000000', 20000000, 8500000, 1800000, 'رينزو باربيرا', 36365, [
    createLowerTierPlayer('ita2_pal_1', 'ألفريد غوميز', 'GK', 31, 74, 1800000, 50000, 1, 'السنغال', 'SEN', 'ita2_palermo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_pal_2', 'ماتيو برونيوري القائد', 'ST', 29, 77, 5500000, 85000, 9, 'إيطاليا', 'ITA', 'ita2_palermo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_pal_3', 'روبرتو إنسيني', 'RW', 30, 75, 2500000, 60000, 11, 'إيطاليا', 'ITA', 'ita2_palermo', 'ita_tier_2'),
    createLowerTierPlayer('ita2_pal_4', 'توماس هنري', 'ST', 29, 74, 3000000, 65000, 20, 'فرنسا', 'FRA', 'ita2_palermo', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_salernitana', 'يو إس ساليرنيتانا 1919', 'ساليرنيتانا', 'ساليرنو', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 73, '#831843', '#ffffff', 18000000, 7500000, 1600000, 'أريكي ستاديوم', 37180, [
    createLowerTierPlayer('ita2_sal_1', 'لويجي سيبي', 'GK', 33, 75, 1800000, 55000, 55, 'إيطاليا', 'ITA', 'ita2_salernitana', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sal_2', 'ديلان برون', 'CB', 29, 74, 2500000, 60000, 2, 'تونس', 'TUN', 'ita2_salernitana', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sal_3', 'جوليو ماغيوري', 'CM', 26, 75, 4500000, 70000, 25, 'إيطاليا', 'ITA', 'ita2_salernitana', 'ita_tier_2'),
    createLowerTierPlayer('ita2_sal_4', 'سيميون نوانكو سيمي', 'ST', 32, 74, 2200000, 58000, 9, 'نيجيريا', 'NGA', 'ita2_salernitana', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_frosinone', 'فروسينوني كالتشيو', 'فروسينوني', 'فروسينوني', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 73, '#eab308', '#2563eb', 17000000, 7000000, 1550000, 'بينيتو ستيربي', 16227, [
    createLowerTierPlayer('ita2_fro_1', 'ميكيلي تشيروفوليني', 'GK', 25, 74, 2200000, 48000, 1, 'إيطاليا', 'ITA', 'ita2_frosinone', 'ita_tier_2'),
    createLowerTierPlayer('ita2_fro_2', 'إيمانويلي فالبوتري', 'ST', 24, 75, 4000000, 62000, 9, 'إيطاليا', 'ITA', 'ita2_frosinone', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_bari', 'إس إس سي باري', 'باري', 'باري', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 72, '#dc2626', '#ffffff', 15000000, 6000000, 1400000, 'سان نيكولا', 58270, [
    createLowerTierPlayer('ita2_bar_1', 'بوريس رادونوفيتش', 'GK', 28, 74, 2000000, 50000, 1, 'صربيا', 'SRB', 'ita2_bari', 'ita_tier_2'),
    createLowerTierPlayer('ita2_bar_2', 'كيفين لاسانيا النفاثة', 'ST', 32, 75, 2500000, 65000, 15, 'إيطاليا', 'ITA', 'ita2_bari', 'ita_tier_2'),
    createLowerTierPlayer('ita2_bar_3', 'أندريا فافيلي', 'ST', 27, 74, 2200000, 55000, 99, 'إيطاليا', 'ITA', 'ita2_bari', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_spezia', 'سبيزيا كالتشيو', 'سبيزيا', 'لا سبيتسيا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 72, '#000000', '#ffffff', 14000000, 5800000, 1350000, 'ألبرتو بيكو', 11968, [
    createLowerTierPlayer('ita2_spe_1', 'ستيفانو غوري', 'GK', 28, 73, 1800000, 46000, 1, 'إيطاليا', 'ITA', 'ita2_spezia', 'ita_tier_2'),
    createLowerTierPlayer('ita2_spe_2', 'سالفاتوري إيسبوزيتو', 'CM', 23, 76, 5000000, 68000, 10, 'إيطاليا', 'ITA', 'ita2_spezia', 'ita_tier_2'),
    createLowerTierPlayer('ita2_spe_3', 'فرانشيسكو بيو إيسبوزيتو', 'ST', 19, 75, 4500000, 50000, 9, 'إيطاليا', 'ITA', 'ita2_spezia', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_brescia', 'بريشيا كالتشيو', 'بريشيا', 'بريشيا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 71, '#1d4ed8', '#ffffff', 13000000, 5200000, 1250000, 'ماريو ريغامونتي', 19500, [
    createLowerTierPlayer('ita2_bre_1', 'لوكا ليزاريني', 'GK', 28, 73, 1700000, 45000, 1, 'إيطاليا', 'ITA', 'ita2_brescia', 'ita_tier_2'),
    createLowerTierPlayer('ita2_bre_2', 'ديميتري بيسولي القائد', 'CM', 30, 75, 2800000, 62000, 25, 'إيطاليا', 'ITA', 'ita2_brescia', 'ita_tier_2'),
    createLowerTierPlayer('ita2_bre_3', 'غينارو بوريلي', 'ST', 24, 74, 3000000, 52000, 29, 'إيطاليا', 'ITA', 'ita2_brescia', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_cremonese', 'يو إس كريمونيسي', 'كريمونيسي', 'كريمونا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 73, '#991b1b', '#9ca3af', 16500000, 6800000, 1500000, 'جيوفاني زيني', 16003, [
    createLowerTierPlayer('ita2_cre_1', 'أندريا فولينياتي', 'GK', 30, 74, 2000000, 50000, 1, 'إيطاليا', 'ITA', 'ita2_cremonese', 'ita_tier_2'),
    createLowerTierPlayer('ita2_cre_2', 'ميكيلي كاستاغنيتي', 'CM', 34, 74, 1500000, 52000, 19, 'إيطاليا', 'ITA', 'ita2_cremonese', 'ita_tier_2'),
    createLowerTierPlayer('ita2_cre_3', 'فرانكو فاسكيز الساحر', 'CAM', 35, 76, 2200000, 75000, 20, 'الأرجنتين', 'ARG', 'ita2_cremonese', 'ita_tier_2'),
    createLowerTierPlayer('ita2_cre_4', 'مانويل دي لوكا', 'ST', 26, 74, 3000000, 55000, 9, 'إيطاليا', 'ITA', 'ita2_cremonese', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_pisa', 'بيزا سبورتينغ كلوب', 'بيزا', 'بيزا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 73, '#1d4ed8', '#000000', 16000000, 6500000, 1480000, 'روميو أنكونيتاني', 14869, [
    createLowerTierPlayer('ita2_pis_1', 'أدريان شيمبر', 'GK', 26, 74, 2400000, 52000, 1, 'كرواتيا', 'CRO', 'ita2_pisa', 'ita_tier_2'),
    createLowerTierPlayer('ita2_pis_2', 'ماريوس مارين', 'CM', 26, 75, 3800000, 60000, 8, 'رومانيا', 'ROU', 'ita2_pisa', 'ita_tier_2'),
    createLowerTierPlayer('ita2_pis_3', 'ماتيو تراموني', 'CAM', 24, 76, 5000000, 68000, 11, 'فرنسا', 'FRA', 'ita2_pisa', 'ita_tier_2'),
    createLowerTierPlayer('ita2_pis_4', 'نيكولاس بونفانتي', 'ST', 22, 75, 4500000, 58000, 9, 'إيطاليا', 'ITA', 'ita2_pisa', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_cesena', 'تشيزينا إف سي', 'تشيزينا', 'تشيزينا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 71, '#000000', '#ffffff', 12500000, 4800000, 1150000, 'دينو مانوتزي', 23860, [
    createLowerTierPlayer('ita2_ces_1', 'جوناثان كلينغمان', 'GK', 27, 72, 1400000, 36000, 1, 'أمريكا', 'USA', 'ita2_cesena', 'ita_tier_2'),
    createLowerTierPlayer('ita2_ces_2', 'كريستيان شيبيندي', 'ST', 20, 76, 6500000, 55000, 11, 'إيطاليا', 'ITA', 'ita2_cesena', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_catanzaro', 'يو إس كاتانزارو 1929', 'كاتانزارو', 'كاتانزارو', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 70, '#eab308', '#dc2626', 11500000, 4400000, 1080000, 'نيكولا سيرافولو', 14650, [
    createLowerTierPlayer('ita2_cat_1', 'ميركو بيلغاتي', 'GK', 31, 72, 1200000, 38000, 1, 'إيطاليا', 'ITA', 'ita2_catanzaro', 'ita_tier_2'),
    createLowerTierPlayer('ita2_cat_2', 'بيترو إييميلو الهداف', 'ST', 32, 75, 2600000, 62000, 9, 'إيطاليا', 'ITA', 'ita2_catanzaro', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_modena', 'مودينا إف سي', 'مودينا', 'مودينا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 70, '#eab308', '#1e3a8a', 11000000, 4200000, 1050000, 'ألبرتو براغليا', 21151, [
    createLowerTierPlayer('ita2_mod_1', 'ريكاردو غاغنو', 'GK', 27, 72, 1400000, 36000, 1, 'إيطاليا', 'ITA', 'ita2_modena', 'ita_tier_2'),
    createLowerTierPlayer('ita2_mod_2', 'أنطونيو بالومبو', 'CM', 28, 75, 3500000, 60000, 5, 'إيطاليا', 'ITA', 'ita2_modena', 'ita_tier_2'),
  ]),

  createLowerTierClub('ita2_reggiana', 'إيه سي ريجيانا 1919', 'ريجيانا', 'ريجيو إميليا', 'إيطاليا', 'ITA', 2, 'ita_tier_2', 69, '#831843', '#ffffff', 10500000, 4000000, 1000000, 'مابي ستاديوم', 21584, [
    createLowerTierPlayer('ita2_reg_1', 'فرانشيسكو باردي', 'GK', 32, 73, 1500000, 42000, 1, 'إيطاليا', 'ITA', 'ita2_reggiana', 'ita_tier_2'),
    createLowerTierPlayer('ita2_reg_2', 'مانولو بورتانوفا', 'CM', 24, 74, 2800000, 52000, 90, 'إيطاليا', 'ITA', 'ita2_reggiana', 'ita_tier_2'),
    createLowerTierPlayer('ita2_reg_3', 'لوكا فيدو', 'ST', 27, 73, 2000000, 46000, 10, 'إيطاليا', 'ITA', 'ita2_reggiana', 'ita_tier_2'),
  ]),
];

// ============================================================================
// 8. FRENCH LIGUE 2 (fra_tier_2) - 14 CLUBS WITH REAL PLAYERS
// ============================================================================
export const FRANCE_LIGUE_2_CLUBS: Club[] = [
  createLowerTierClub('fra2_metz', 'إف سي ميتز', 'ميتز', 'ميتز', 'فرنسا', 'FRA', 2, 'fra_tier_2', 74, '#831843', '#ffffff', 20000000, 8500000, 1750000, 'سانت سيمفوريان', 28786, [
    createLowerTierPlayer('fra2_met_1', 'ألكسندر أوكيدجا', 'GK', 36, 75, 1500000, 50000, 16, 'الجزائر', 'ALG', 'fra2_metz', 'fra_tier_2'),
    createLowerTierPlayer('fra2_met_2', 'إسماعيل تراوري', 'CB', 38, 73, 800000, 42000, 8, 'ساحل العاج', 'CIV', 'fra2_metz', 'fra_tier_2'),
    createLowerTierPlayer('fra2_met_3', 'غوتييه هاين', 'CAM', 28, 76, 4500000, 70000, 7, 'فرنسا', 'FRA', 'fra2_metz', 'fra_tier_2'),
    createLowerTierPlayer('fra2_met_4', 'شيك سابالي', 'RW', 25, 75, 3800000, 60000, 11, 'السنغال', 'SEN', 'fra2_metz', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_lorient', 'إف سي لوريان', 'لوريان', 'لوريان', 'فرنسا', 'FRA', 2, 'fra_tier_2', 74, '#ea580c', '#000000', 21000000, 9000000, 1800000, 'ستاد دو موستوار', 18890, [
    createLowerTierPlayer('fra2_lor_1', 'إيفون مفوغو', 'GK', 30, 77, 4000000, 75000, 38, 'سويسرا', 'SUI', 'fra2_lorient', 'fra_tier_2'),
    createLowerTierPlayer('fra2_lor_2', 'لوران أبيرجيل القائد', 'CDM', 31, 76, 3000000, 68000, 6, 'فرنسا', 'FRA', 'fra2_lorient', 'fra_tier_2'),
    createLowerTierPlayer('fra2_lor_3', 'إيلي جونيور كروبي الموهبة', 'ST', 18, 76, 9000000, 60000, 22, 'فرنسا', 'FRA', 'fra2_lorient', 'fra_tier_2'),
    createLowerTierPlayer('fra2_lor_4', 'محمد بامبا الهداف', 'ST', 22, 76, 6500000, 65000, 9, 'ساحل العاج', 'CIV', 'fra2_lorient', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_paris_fc', 'باريس إف سي', 'باريس إف سي', 'باريس', 'فرنسا', 'FRA', 2, 'fra_tier_2', 73, '#1e3a8a', '#ffffff', 25000000, 11000000, 2000000, 'ستاد شارليتي', 20000, [
    createLowerTierPlayer('fra2_pfc_1', 'أوبيد نكامباديو', 'GK', 21, 74, 3000000, 48000, 16, 'فرنسا', 'FRA', 'fra2_paris_fc', 'fra_tier_2'),
    createLowerTierPlayer('fra2_pfc_2', 'ماكسيم لوبيز النجم', 'CM', 26, 77, 8000000, 85000, 8, 'فرنسا', 'FRA', 'fra2_paris_fc', 'fra_tier_2'),
    createLowerTierPlayer('fra2_pfc_3', 'إيلان كيبال الساحر', 'CAM', 26, 76, 4500000, 65000, 10, 'الجزائر', 'ALG', 'fra2_paris_fc', 'fra_tier_2'),
    createLowerTierPlayer('fra2_pfc_4', 'جان فيليب كراسو', 'ST', 27, 76, 5000000, 72000, 9, 'ساحل العاج', 'CIV', 'fra2_paris_fc', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_clermont', 'كليرمون فوت 63', 'كليرمون', 'كليرمون فيران', 'فرنسا', 'FRA', 2, 'fra_tier_2', 71, '#991b1b', '#1e3a8a', 15000000, 6000000, 1350000, 'ستاد غابرييل مونبييه', 13000, [
    createLowerTierPlayer('fra2_cle_1', 'ماسيمبا ندياي', 'GK', 22, 72, 1800000, 38000, 1, 'السنغال', 'SEN', 'fra2_clermont', 'fra_tier_2'),
    createLowerTierPlayer('fra2_cle_2', 'حبيب كيتا', 'CM', 22, 74, 3500000, 52000, 8, 'مالي', 'MLI', 'fra2_clermont', 'fra_tier_2'),
    createLowerTierPlayer('fra2_cle_3', 'فامارا ديديو', 'ST', 31, 74, 2000000, 55000, 11, 'السنغال', 'SEN', 'fra2_clermont', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_caen', 'إس إم كان', 'كان', 'كان', 'فرنسا', 'FRA', 2, 'fra_tier_2', 72, '#1d4ed8', '#dc2626', 17000000, 7000000, 1500000, 'ستاد ميشيل دورنانو', 20300, [
    createLowerTierPlayer('fra2_cae_1', 'أنطوني ماندريا', 'GK', 27, 75, 3000000, 55000, 1, 'الجزائر', 'ALG', 'fra2_caen', 'fra_tier_2'),
    createLowerTierPlayer('fra2_cae_2', 'يان مفيلا الأسطورة', 'CDM', 34, 75, 2000000, 65000, 6, 'فرنسا', 'FRA', 'fra2_caen', 'fra_tier_2'),
    createLowerTierPlayer('fra2_cae_3', 'ألكسندر ميندي القناص', 'ST', 30, 76, 4500000, 75000, 19, 'غينيا بيساو', 'GNB', 'fra2_caen', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_guingamp', 'إن أفا غانغان', 'غانغان', 'غانغان', 'فرنسا', 'FRA', 2, 'fra_tier_2', 71, '#dc2626', '#000000', 14000000, 5500000, 1250000, 'ستاد دو رودورو', 18462, [
    createLowerTierPlayer('fra2_gui_1', 'إنزو باسيليو', 'GK', 29, 73, 1900000, 44000, 1, 'فرنسا', 'FRA', 'fra2_guingamp', 'fra_tier_2'),
    createLowerTierPlayer('fra2_gui_2', 'أمادو سانيا', 'LW', 25, 74, 3000000, 50000, 11, 'السنغال', 'SEN', 'fra2_guingamp', 'fra_tier_2'),
    createLowerTierPlayer('fra2_gui_3', 'جاك سيويه', 'ST', 23, 74, 3200000, 52000, 9, 'فرنسا', 'FRA', 'fra2_guingamp', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_dunkerque', 'يو إس إل دونكيرك', 'دونكيرك', 'دونكيرك', 'فرنسا', 'FRA', 2, 'fra_tier_2', 71, '#0284c7', '#ffffff', 13500000, 5200000, 1200000, 'ستاد تريبيوت', 5000, [
    createLowerTierPlayer('fra2_dun_1', 'إوين جايشيل', 'GK', 23, 73, 2000000, 42000, 1, 'فرنسا', 'FRA', 'fra2_dunkerque', 'fra_tier_2'),
    createLowerTierPlayer('fra2_dun_2', 'ماكسنس ريفيرا', 'RW', 22, 74, 3000000, 48000, 10, 'فرنسا', 'FRA', 'fra2_dunkerque', 'fra_tier_2'),
    createLowerTierPlayer('fra2_dun_3', 'ياسين بلخير', 'ST', 24, 74, 3200000, 50000, 11, 'الجزائر', 'ALG', 'fra2_dunkerque', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_annecy', 'إف سي آنسي', 'آنسي', 'آنسي', 'فرنسا', 'FRA', 2, 'fra_tier_2', 70, '#dc2626', '#ffffff', 12000000, 4500000, 1100000, 'بارك دي سبورت', 13600, [
    createLowerTierPlayer('fra2_ann_1', 'فلوريان إسكال', 'GK', 28, 73, 1800000, 40000, 1, 'فرنسا', 'FRA', 'fra2_annecy', 'fra_tier_2'),
    createLowerTierPlayer('fra2_ann_2', 'أنطوان لاروسي', 'ST', 25, 74, 2800000, 48000, 9, 'فرنسا', 'FRA', 'fra2_annecy', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_ajaccio', 'إيه سي أجاكسيو', 'أجاكسيو', 'أجاكسيو', 'فرنسا', 'FRA', 2, 'fra_tier_2', 70, '#ffffff', '#dc2626', 11500000, 4200000, 1050000, 'ستاد فرانسوا كوتي', 10600, [
    createLowerTierPlayer('fra2_aja_1', 'فرانسوا جوزيف سولاكارو', 'GK', 24, 73, 2000000, 42000, 16, 'فرنسا', 'FRA', 'fra2_ajaccio', 'fra_tier_2'),
    createLowerTierPlayer('fra2_aja_2', 'توماس مانغاني المخضرم', 'CM', 37, 73, 800000, 45000, 6, 'فرنسا', 'FRA', 'fra2_ajaccio', 'fra_tier_2'),
    createLowerTierPlayer('fra2_aja_3', 'كريستوفر إيبايي', 'ST', 26, 73, 2200000, 46000, 9, 'فرنسا', 'FRA', 'fra2_ajaccio', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_bastia', 'إس سي باستيا', 'باستيا', 'باستيا', 'فرنسا', 'FRA', 2, 'fra_tier_2', 70, '#1d4ed8', '#ffffff', 12000000, 4400000, 1100000, 'ستاد أرماند سيزاري', 16000, [
    createLowerTierPlayer('fra2_bas_1', 'جوني بلاسيد', 'GK', 36, 73, 900000, 40000, 30, 'هايتي', 'HAI', 'fra2_bastia', 'fra_tier_2'),
    createLowerTierPlayer('fra2_bas_2', 'جوسلين جانيه', 'CAM', 25, 74, 3000000, 50000, 10, 'فرنسا', 'FRA', 'fra2_bastia', 'fra_tier_2'),
    createLowerTierPlayer('fra2_bas_3', 'لامين سيسيه', 'ST', 21, 74, 3500000, 48000, 91, 'فرنسا', 'FRA', 'fra2_bastia', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_grenoble', 'غرونوبل فوت 38', 'غرونوبل', 'غرونوبل', 'فرنسا', 'FRA', 2, 'fra_tier_2', 69, '#2563eb', '#ffffff', 11000000, 4000000, 1000000, 'ستاد دي ألب', 20068, [
    createLowerTierPlayer('fra2_gre_1', 'بوباكار فوفانا', 'GK', 26, 72, 1500000, 36000, 1, 'فرنسا', 'FRA', 'fra2_grenoble', 'fra_tier_2'),
    createLowerTierPlayer('fra2_gre_2', 'بابي با الهداف', 'ST', 28, 74, 2800000, 50000, 11, 'السنغال', 'SEN', 'fra2_grenoble', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_pau', 'باو إف سي', 'باو', 'باو', 'فرنسا', 'FRA', 2, 'fra_tier_2', 69, '#eab308', '#2563eb', 10500000, 3800000, 950000, 'نويستري كامب', 4031, [
    createLowerTierPlayer('fra2_pau_1', 'بينغورو كامارا', 'GK', 27, 73, 2000000, 42000, 1, 'السنغال', 'SEN', 'fra2_pau', 'fra_tier_2'),
    createLowerTierPlayer('fra2_pau_2', 'خالد بوطيب الهداف', 'ST', 37, 73, 800000, 45000, 9, 'المغرب', 'MAR', 'fra2_pau', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_laval', 'ستاد لافال', 'لافال', 'لافال', 'فرنسا', 'FRA', 2, 'fra_tier_2', 69, '#ea580c', '#000000', 10000000, 3600000, 920000, 'ستاد فرانسيس لو باسر', 11100, [
    createLowerTierPlayer('fra2_lav_1', 'مامادو ساماسا', 'GK', 34, 73, 1200000, 40000, 16, 'مالي', 'MLI', 'fra2_laval', 'fra_tier_2'),
    createLowerTierPlayer('fra2_lav_2', 'مالك تشوكونتي', 'ST', 36, 73, 900000, 42000, 9, 'فرنسا', 'FRA', 'fra2_laval', 'fra_tier_2'),
  ]),

  createLowerTierClub('fra2_amiens', 'أميان إس سي', 'أميان', 'أميان', 'فرنسا', 'FRA', 2, 'fra_tier_2', 69, '#ffffff', '#000000', 10800000, 3900000, 980000, 'ستاد دو لا ليكورن', 12097, [
    createLowerTierPlayer('fra2_ami_1', 'ريجيس غورتنر القائد', 'GK', 37, 74, 1000000, 48000, 1, 'فرنسا', 'FRA', 'fra2_amiens', 'fra_tier_2'),
    createLowerTierPlayer('fra2_ami_2', 'أنطوان لوتيه', 'ST', 24, 74, 3000000, 48000, 9, 'فرنسا', 'FRA', 'fra2_amiens', 'fra_tier_2'),
  ]),
];

// ============================================================================
// 9. SPANISH SEGUNDA FEDERACIÓN (esp_tier_4) - 14 CLUBS WITH REAL PLAYERS
// ============================================================================
export const SPAIN_TIER_4_CLUBS: Club[] = [
  createLowerTierClub('esp4_numancia', 'سي دي نومانسيا سوريل', 'نومانسيا', 'سوريا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 59, '#dc2626', '#1d4ed8', 3500000, 1100000, 380000, 'لوس باخاريتوس', 8261, [
    createLowerTierPlayer('esp4_num_1', 'دورو نسورو المخضرم', 'GK', 38, 68, 250000, 14000, 1, 'إسبانيا', 'ESP', 'esp4_numancia', 'esp_tier_4'),
    createLowerTierPlayer('esp4_num_2', 'خافي بونيلا القائد', 'LB', 33, 69, 350000, 18000, 17, 'إسبانيا', 'ESP', 'esp4_numancia', 'esp_tier_4'),
    createLowerTierPlayer('esp4_num_3', 'أندر ريبيرو', 'ST', 26, 68, 500000, 16000, 9, 'إسبانيا', 'ESP', 'esp4_numancia', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_pontevedra', 'بونتيفيدرا سي إف الغاليسي', 'بونتيفيدرا', 'بونتيفيدرا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 58, '#831843', '#ffffff', 3200000, 1000000, 360000, 'باسارون', 10500, [
    createLowerTierPlayer('esp4_pon_1', 'إيدو سوزا الحارس', 'GK', 33, 68, 300000, 15000, 1, 'إسبانيا', 'ESP', 'esp4_pontevedra', 'esp_tier_4'),
    createLowerTierPlayer('esp4_pon_2', 'روفو الهداف التاريخي', 'ST', 31, 69, 400000, 17000, 9, 'إسبانيا', 'ESP', 'esp4_pontevedra', 'esp_tier_4'),
    createLowerTierPlayer('esp4_pon_3', 'أليكس غونزاليس', 'LM', 32, 68, 320000, 15000, 7, 'إسبانيا', 'ESP', 'esp4_pontevedra', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_compostela', 'إس دي كومبوستيلا العريق', 'كومبوستيلا', 'سانتياغو', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 58, '#0284c7', '#ffffff', 3100000, 950000, 350000, 'سان لازارو', 12000, [
    createLowerTierPlayer('esp4_com_1', 'باتو غيين الأمين', 'GK', 39, 67, 180000, 13000, 1, 'أوروغواي', 'URU', 'esp4_compostela', 'esp_tier_4'),
    createLowerTierPlayer('esp4_com_2', 'مانو باريرو العملاق', 'ST', 38, 68, 220000, 16000, 9, 'إسبانيا', 'ESP', 'esp4_compostela', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_europa', 'سي إي يوروبا برشلونة', 'يوروبا', 'برشلونة', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 57, '#2563eb', '#ffffff', 2800000, 850000, 320000, 'نو ساردينيا', 4000, [
    createLowerTierPlayer('esp4_eur_1', 'باو توريس الحارس', 'GK', 37, 67, 190000, 13000, 1, 'إسبانيا', 'ESP', 'esp4_europa', 'esp_tier_4'),
    createLowerTierPlayer('esp4_eur_2', 'أليكس بلا صانع الألعاب', 'CAM', 31, 68, 300000, 15000, 10, 'إسبانيا', 'ESP', 'esp4_europa', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_badalona', 'سي إف بادالونا فيوتشر', 'بادالونا', 'بادالونا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 57, '#1d4ed8', '#ffffff', 2700000, 800000, 310000, 'الملعب البلدي ببادالونا', 4170, [
    createLowerTierPlayer('esp4_bad_1', 'إيزاك بيسيرا', 'GK', 36, 67, 200000, 13000, 13, 'إسبانيا', 'ESP', 'esp4_badalona', 'esp_tier_4'),
    createLowerTierPlayer('esp4_bad_2', 'جينار فورنيس', 'CB', 24, 68, 420000, 14000, 4, 'إسبانيا', 'ESP', 'esp4_badalona', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_talavera', 'سي إف تالافيرا دي لا رينا', 'تالافيرا', 'تالافيرا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 57, '#2563eb', '#ffffff', 2650000, 780000, 300000, 'إل برادو', 5000, [
    createLowerTierPlayer('esp4_tal_1', 'بييل ريباس الحارس', 'GK', 38, 67, 180000, 12000, 1, 'إسبانيا', 'ESP', 'esp4_talavera', 'esp_tier_4'),
    createLowerTierPlayer('esp4_tal_2', 'ألكسندر شيمانوفسكي', 'LW', 35, 68, 250000, 15000, 11, 'الأرجنتين', 'ARG', 'esp4_talavera', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_sabadell', 'سي إي ساباديل إف سي', 'ساباديل', 'ساباديل', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 58, '#2563eb', '#ffffff', 3100000, 950000, 350000, 'نوفا كرو ألتا', 11900, [
    createLowerTierPlayer('esp4_sab_1', 'جياني كاسارو', 'GK', 32, 68, 300000, 14000, 1, 'إسبانيا', 'ESP', 'esp4_sabadell', 'esp_tier_4'),
    createLowerTierPlayer('esp4_sab_2', 'ميغي غارسيا', 'ST', 33, 68, 280000, 15000, 9, 'إسبانيا', 'ESP', 'esp4_sabadell', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_aviles', 'ريال أفيليس إندستريال', 'أفيليس', 'أفيليس', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 56, '#000000', '#ffffff', 2500000, 750000, 290000, 'رومان سواريز بويلتا', 5400, [
    createLowerTierPlayer('esp4_avi_1', 'ألفارو فرنانديز', 'GK', 24, 67, 350000, 12000, 1, 'إسبانيا', 'ESP', 'esp4_aviles', 'esp_tier_4'),
    createLowerTierPlayer('esp4_avi_2', 'ناتاليو المخضرم', 'ST', 39, 67, 150000, 13000, 7, 'إسبانيا', 'ESP', 'esp4_aviles', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_guijuelo', 'سي دي غيخويلو سالامانكا', 'غيخويلو', 'سالامانكا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 56, '#15803d', '#ffffff', 2400000, 700000, 280000, 'الملعب البلدي بغيخويلو', 1500, [
    createLowerTierPlayer('esp4_gui_1', 'يوهان غوزمان', 'GK', 27, 67, 300000, 12000, 1, 'جمهورية الدومينيكان', 'DOM', 'esp4_guijuelo', 'esp_tier_4'),
    createLowerTierPlayer('esp4_gui_2', 'خوان أنطونيو الهداف', 'ST', 32, 67, 260000, 13000, 9, 'إسبانيا', 'ESP', 'esp4_guijuelo', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_yeclano', 'يكلانو ديبورتيفو مورسيا', 'يكلانو', 'يكلا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 56, '#dc2626', '#1d4ed8', 2450000, 720000, 285000, 'لا كونستيتوسيون', 4000, [
    createLowerTierPlayer('esp4_yec_1', 'سيرجيو دياز الحامي', 'GK', 28, 67, 290000, 12000, 1, 'إسبانيا', 'ESP', 'esp4_yeclano', 'esp_tier_4'),
    createLowerTierPlayer('esp4_yec_2', 'نارانخو الهداف', 'ST', 24, 68, 420000, 13500, 9, 'إسبانيا', 'ESP', 'esp4_yeclano', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_sanluqueno', 'أتلتيكو سانلوكينيو قادس', 'سانلوكينيو', 'سانلوكار', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 57, '#15803d', '#ffffff', 2600000, 760000, 300000, 'إل بالومار', 5000, [
    createLowerTierPlayer('esp4_san_1', 'سامو بيريز', 'GK', 27, 67, 320000, 12500, 1, 'إسبانيا', 'ESP', 'esp4_sanluqueno', 'esp_tier_4'),
    createLowerTierPlayer('esp4_san_2', 'أيرام كابريرا المهاجم', 'ST', 36, 68, 220000, 14000, 9, 'إسبانيا', 'ESP', 'esp4_sanluqueno', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_lleida', 'ليريدا إسبورتيو الكتالوني', 'ليريدا', 'ليريدا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 57, '#2563eb', '#ffffff', 2700000, 800000, 310000, 'كامب ديسبورتس', 13500, [
    createLowerTierPlayer('esp4_lle_1', 'إيناكي ألفاريز', 'GK', 26, 67, 340000, 12500, 1, 'إسبانيا', 'ESP', 'esp4_lleida', 'esp_tier_4'),
    createLowerTierPlayer('esp4_lle_2', 'تشولي المهاجم المخضرم', 'ST', 33, 68, 280000, 14500, 9, 'إسبانيا', 'ESP', 'esp4_lleida', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_linense', 'ريال بالومبيديكا لينينسي', 'لينينسي', 'لا لينيا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 56, '#000000', '#ffffff', 2400000, 700000, 280000, 'الملعب البلدي لا لينيا', 10800, [
    createLowerTierPlayer('esp4_lin2_1', 'فاكوندو أكرمان', 'GK', 30, 67, 280000, 12000, 1, 'أوروغواي', 'URU', 'esp4_linense', 'esp_tier_4'),
    createLowerTierPlayer('esp4_lin2_2', 'أريداني سانتانا', 'ST', 37, 67, 180000, 13000, 9, 'إسبانيا', 'ESP', 'esp4_linense', 'esp_tier_4'),
  ]),

  createLowerTierClub('esp4_segoviana', 'خيمناستيكا سيغوفيانا', 'سيغوفيانا', 'سيغوفيا', 'إسبانيا', 'ESP', 4, 'esp_tier_4', 56, '#dc2626', '#2563eb', 2350000, 680000, 275000, 'لا ألبويرا', 6000, [
    createLowerTierPlayer('esp4_seg_1', 'كارمونا الحارس', 'GK', 28, 67, 290000, 12000, 1, 'إسبانيا', 'ESP', 'esp4_segoviana', 'esp_tier_4'),
    createLowerTierPlayer('esp4_seg_2', 'داني سيغوفيا الهداف', 'ST', 38, 67, 160000, 13000, 9, 'إسبانيا', 'ESP', 'esp4_segoviana', 'esp_tier_4'),
  ]),
];

