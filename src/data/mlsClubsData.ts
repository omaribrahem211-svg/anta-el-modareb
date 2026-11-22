import type { Club } from '../types/game';
import { createClub } from './realClubsData';
import facts from './mls2026RosterFacts.json';
import metadata from './mlsClubMetadata.json';

const names: Record<string, string> = {
  mls_atlanta_united: 'أتلانتا يونايتد', mls_austin_fc: 'أوستن', mls_cf_montreal: 'مونتريال',
  mls_charlotte_fc: 'شارلوت', mls_chicago_fire_fc: 'شيكاغو فاير', mls_colorado_rapids: 'كولورادو رابيدز',
  mls_columbus_crew: 'كولومبوس كرو', mls_d_c_united: 'دي سي يونايتد', mls_fc_cincinnati: 'سينسيناتي',
  mls_fc_dallas: 'دالاس', mls_houston_dynamo_fc: 'هيوستن دينامو', mls_inter_miami_cf: 'إنتر ميامي',
  mls_la_galaxy: 'لوس أنجلوس جالاكسي', mls_los_angeles_football_club: 'لوس أنجلوس إف سي',
  mls_minnesota_united_fc: 'مينيسوتا يونايتد', mls_nashville_sc: 'ناشفيل',
  mls_new_england_revolution: 'نيو إنجلاند ريفولوشن', mls_new_york_city_football_club: 'نيويورك سيتي',
  mls_orlando_city: 'أورلاندو سيتي', mls_philadelphia_union: 'فيلادلفيا يونيون',
  mls_portland_timbers: 'بورتلاند تيمبرز', mls_real_salt_lake: 'ريال سولت ليك',
  mls_red_bull_new_york: 'ريد بول نيويورك', mls_san_diego_fc: 'سان دييجو',
  mls_san_jose_earthquakes: 'سان خوسيه إيرثكويكس', mls_seattle_sounders_fc: 'سياتل ساوندرز',
  mls_sporting_kansas_city: 'سبورتنج كانساس سيتي', mls_st_louis_city_sc: 'سانت لويس سيتي',
  mls_toronto_fc: 'تورونتو', mls_vancouver_whitecaps_fc: 'فانكوفر وايتكابس',
};

/** Real club identities/venues with game-balanced finances and reputation.
 * Operational soccer capacities are snapshot values; NYC uses its primary Yankee Stadium configuration.
 */
export const MLS_CLUBS: Club[] = facts.clubs.map((club, index) => {
  const meta = metadata.clubs[club.id as keyof typeof metadata.clubs];
  if (!meta || !names[club.id]) throw new Error(`Missing MLS club metadata: ${club.id}`);
  const reputation = club.id === 'mls_inter_miami_cf' ? 86 : 75 + index % 7;
  return createClub(club.id, names[club.id], names[club.id], meta.city,
    meta.countryCode === 'CAN' ? 'كندا' : 'الولايات المتحدة', meta.countryCode, 1, 'usa_tier_1',
    reputation, 72, meta.colors[0], meta.colors[1], 35_000_000, 15_000_000, 2_000_000,
    meta.stadiumName, meta.stadiumCapacity, 4);
});
