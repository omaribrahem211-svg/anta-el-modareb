/**
 * =========================================================================
 * تقييمات واقعية تقريبية لأبرز نجوم العالم ومصر والوطن العربي (نمط EA FC)
 * ملاحظة: الأرقام والتقييمات هنا تقريبية وتُراجع وتُعدل يدوياً.
 * =========================================================================
 */

import { PlayerAttributes } from '../types/game';

export interface StarRatingOverride {
  ovr: number;
  pot?: number;
  attributes?: Partial<PlayerAttributes>;
}

export const STAR_RATINGS_OVERRIDES: Record<string, StarRatingOverride> = {
  // =========================================================================
  // 1. REAL MADRID CF
  // =========================================================================
  'real_madrid_kylian_mbappe': { ovr: 91, pot: 94, attributes: { pace: 97, shooting: 90, passing: 82, dribbling: 92, defending: 36, physical: 78 } },
  'real_madrid_vinicius_junior': { ovr: 90, pot: 94, attributes: { pace: 95, shooting: 84, passing: 81, dribbling: 92, defending: 29, physical: 69 } },
  'real_madrid_jude_bellingham': { ovr: 90, pot: 95, attributes: { pace: 80, shooting: 87, passing: 85, dribbling: 88, defending: 78, physical: 83 } },
  'real_madrid_thibaut_courtois': { ovr: 89, pot: 89, attributes: { pace: 46, shooting: 20, passing: 72, dribbling: 50, defending: 25, physical: 78, goalkeeping: 89 } },
  'real_madrid_federico_valverde': { ovr: 88, pot: 91, attributes: { pace: 88, shooting: 84, passing: 84, dribbling: 84, defending: 81, physical: 84 } },
  'real_madrid_antonio_rudiger': { ovr: 88, pot: 88, attributes: { pace: 82, shooting: 55, passing: 72, dribbling: 68, defending: 88, physical: 89 } },
  'real_madrid_eder_militao': { ovr: 87, pot: 90, attributes: { pace: 85, shooting: 50, passing: 71, dribbling: 72, defending: 87, physical: 85 } },
  'real_madrid_rodrygo': { ovr: 86, pot: 90, attributes: { pace: 89, shooting: 82, passing: 81, dribbling: 88, defending: 32, physical: 65 } },
  'real_madrid_dani_carvajal': { ovr: 86, pot: 86, attributes: { pace: 81, shooting: 56, passing: 80, dribbling: 81, defending: 84, physical: 81 } },
  'real_madrid_aurelien_tchouameni': { ovr: 86, pot: 90, attributes: { pace: 74, shooting: 71, passing: 81, dribbling: 80, defending: 84, physical: 83 } },
  'real_madrid_eduardo_camavinga': { ovr: 86, pot: 91, attributes: { pace: 82, shooting: 68, passing: 82, dribbling: 84, defending: 82, physical: 82 } },
  'real_madrid_luka_modric': { ovr: 85, pot: 85, attributes: { pace: 68, shooting: 76, passing: 89, dribbling: 86, defending: 70, physical: 64 } },
  'real_madrid_ferland_mendy': { ovr: 83, pot: 83, attributes: { pace: 89, shooting: 64, passing: 75, dribbling: 79, defending: 83, physical: 84 } },
  'real_madrid_brahim_diaz': { ovr: 82, pot: 86, attributes: { pace: 84, shooting: 78, passing: 80, dribbling: 86, defending: 38, physical: 58 } },
  'real_madrid_andriy_lunin': { ovr: 82, pot: 86, attributes: { pace: 48, shooting: 18, passing: 68, dribbling: 45, defending: 22, physical: 74, goalkeeping: 82 } },
  'real_madrid_arda_guler': { ovr: 80, pot: 89, attributes: { pace: 74, shooting: 76, passing: 84, dribbling: 85, defending: 45, physical: 56 } },
  'real_madrid_endrick': { ovr: 80, pot: 92, attributes: { pace: 89, shooting: 82, passing: 68, dribbling: 82, defending: 35, physical: 80 } },

  // =========================================================================
  // 2. MANCHESTER CITY
  // =========================================================================
  'city_rodri': { ovr: 91, pot: 91, attributes: { pace: 66, shooting: 80, passing: 86, dribbling: 84, defending: 87, physical: 85 } },
  'city_erling_haaland': { ovr: 91, pot: 94, attributes: { pace: 89, shooting: 93, passing: 70, dribbling: 81, defending: 45, physical: 88 } },
  'city_kevin_de_bruyne': { ovr: 90, pot: 90, attributes: { pace: 67, shooting: 87, passing: 94, dribbling: 87, defending: 65, physical: 74 } },
  'city_phil_foden': { ovr: 88, pot: 91, attributes: { pace: 86, shooting: 86, passing: 87, dribbling: 90, defending: 57, physical: 64 } },
  'city_bernardo_silva': { ovr: 88, pot: 88, attributes: { pace: 69, shooting: 78, passing: 86, dribbling: 92, defending: 68, physical: 74 } },
  'city_ruben_dias': { ovr: 88, pot: 90, attributes: { pace: 65, shooting: 40, passing: 73, dribbling: 68, defending: 89, physical: 87 } },
  'city_ederson': { ovr: 88, pot: 88, attributes: { pace: 62, shooting: 25, passing: 91, dribbling: 60, defending: 25, physical: 78, goalkeeping: 88 } },
  'city_josko_gvardiol': { ovr: 85, pot: 89, attributes: { pace: 78, shooting: 64, passing: 76, dribbling: 77, defending: 85, physical: 84 } },
  'city_john_stones': { ovr: 85, pot: 85, attributes: { pace: 72, shooting: 52, passing: 81, dribbling: 79, defending: 85, physical: 78 } },
  'city_ilkay_gundogan': { ovr: 85, pot: 85, attributes: { pace: 64, shooting: 80, passing: 86, dribbling: 84, defending: 72, physical: 70 } },
  'city_manuel_akanji': { ovr: 84, pot: 85, attributes: { pace: 80, shooting: 48, passing: 77, dribbling: 75, defending: 84, physical: 81 } },
  'city_jack_grealish': { ovr: 84, pot: 84, attributes: { pace: 78, shooting: 76, passing: 84, dribbling: 88, defending: 50, physical: 76 } },
  'city_jeremy_doku': { ovr: 82, pot: 87, attributes: { pace: 93, shooting: 70, passing: 75, dribbling: 89, defending: 35, physical: 68 } },
  'city_mateo_kovacic': { ovr: 83, pot: 83, attributes: { pace: 72, shooting: 70, passing: 83, dribbling: 87, defending: 74, physical: 72 } },
  'city_savinho': { ovr: 82, pot: 88, attributes: { pace: 88, shooting: 76, passing: 78, dribbling: 87, defending: 38, physical: 64 } },

  // =========================================================================
  // 3. LIVERPOOL FC
  // =========================================================================
  'liverpool_mohamed_salah': { ovr: 89, pot: 89, attributes: { pace: 89, shooting: 88, passing: 83, dribbling: 88, defending: 45, physical: 76 } },
  'liv_mo_salah': { ovr: 89, pot: 89, attributes: { pace: 89, shooting: 88, passing: 83, dribbling: 88, defending: 45, physical: 76 } },
  'liv_virgil_van_dijk': { ovr: 89, pot: 89, attributes: { pace: 78, shooting: 60, passing: 72, dribbling: 72, defending: 89, physical: 86 } },
  'liv_alisson': { ovr: 89, pot: 89, attributes: { pace: 50, shooting: 22, passing: 85, dribbling: 50, defending: 20, physical: 78, goalkeeping: 89 } },
  'liv_trent_alexander_arnold': { ovr: 86, pot: 88, attributes: { pace: 76, shooting: 72, passing: 91, dribbling: 80, defending: 80, physical: 73 } },
  'liv_alexis_mac_allister': { ovr: 86, pot: 88, attributes: { pace: 70, shooting: 79, passing: 85, dribbling: 83, defending: 78, physical: 78 } },
  'liv_dominik_szoboszlai': { ovr: 84, pot: 87, attributes: { pace: 83, shooting: 84, passing: 84, dribbling: 83, defending: 62, physical: 76 } },
  'liv_luis_diaz': { ovr: 85, pot: 85, attributes: { pace: 90, shooting: 80, passing: 76, dribbling: 87, defending: 42, physical: 76 } },
  'liv_ibrahima_konate': { ovr: 85, pot: 88, attributes: { pace: 78, shooting: 40, passing: 68, dribbling: 65, defending: 86, physical: 88 } },
  'liv_andy_robertson': { ovr: 85, pot: 85, attributes: { pace: 80, shooting: 62, passing: 82, dribbling: 79, defending: 82, physical: 79 } },
  'liv_ryan_gravenberch': { ovr: 84, pot: 88, attributes: { pace: 81, shooting: 75, passing: 81, dribbling: 85, defending: 78, physical: 82 } },
  'liv_cody_gakpo': { ovr: 83, pot: 85, attributes: { pace: 82, shooting: 82, passing: 78, dribbling: 83, defending: 45, physical: 78 } },
  'liv_diogo_jota': { ovr: 84, pot: 84, attributes: { pace: 82, shooting: 84, passing: 75, dribbling: 85, defending: 55, physical: 76 } },
  'liv_darwin_nunez': { ovr: 82, pot: 85, attributes: { pace: 90, shooting: 81, passing: 71, dribbling: 78, defending: 42, physical: 86 } },

  // =========================================================================
  // 4. FC BARCELONA
  // =========================================================================
  'barca_robert_lewandowski': { ovr: 88, pot: 88, attributes: { pace: 75, shooting: 89, passing: 80, dribbling: 85, defending: 44, physical: 82 } },
  'barca_ter_stegen': { ovr: 89, pot: 89, attributes: { pace: 48, shooting: 18, passing: 88, dribbling: 45, defending: 22, physical: 76, goalkeeping: 89 } },
  'barca_lamine_yamal': { ovr: 84, pot: 94, attributes: { pace: 88, shooting: 78, passing: 83, dribbling: 89, defending: 36, physical: 58 } },
  'barca_raphinha': { ovr: 86, pot: 86, attributes: { pace: 91, shooting: 83, passing: 82, dribbling: 86, defending: 52, physical: 74 } },
  'barca_pedri': { ovr: 86, pot: 91, attributes: { pace: 77, shooting: 72, passing: 87, dribbling: 89, defending: 68, physical: 72 } },
  'barca_frenkie_de_jong': { ovr: 87, pot: 88, attributes: { pace: 81, shooting: 69, passing: 86, dribbling: 88, defending: 78, physical: 78 } },
  'barca_jules_kounde': { ovr: 86, pot: 89, attributes: { pace: 84, shooting: 45, passing: 76, dribbling: 74, defending: 86, physical: 81 } },
  'barca_ronald_araujo': { ovr: 85, pot: 89, attributes: { pace: 82, shooting: 51, passing: 65, dribbling: 64, defending: 87, physical: 85 } },
  'barca_dani_olmo': { ovr: 85, pot: 86, attributes: { pace: 78, shooting: 82, passing: 84, dribbling: 87, defending: 52, physical: 66 } },
  'barca_gavi': { ovr: 84, pot: 90, attributes: { pace: 76, shooting: 68, passing: 80, dribbling: 84, defending: 74, physical: 80 } },
  'barca_alejandro_balde': { ovr: 82, pot: 88, attributes: { pace: 91, shooting: 55, passing: 75, dribbling: 81, defending: 77, physical: 72 } },
  'barca_pau_cubarsi': { ovr: 80, pot: 90, attributes: { pace: 72, shooting: 40, passing: 83, dribbling: 73, defending: 81, physical: 75 } },

  // =========================================================================
  // 5. ARSENAL FC
  // =========================================================================
  'ars_bukayo_saka': { ovr: 88, pot: 91, attributes: { pace: 86, shooting: 83, passing: 83, dribbling: 88, defending: 65, physical: 76 } },
  'ars_saka': { ovr: 88, pot: 91, attributes: { pace: 86, shooting: 83, passing: 83, dribbling: 88, defending: 65, physical: 76 } },
  'ars_martin_odegaard': { ovr: 89, pot: 90, attributes: { pace: 75, shooting: 82, passing: 89, dribbling: 89, defending: 68, physical: 66 } },
  'ars_odegaard': { ovr: 89, pot: 90, attributes: { pace: 75, shooting: 82, passing: 89, dribbling: 89, defending: 68, physical: 66 } },
  'ars_declan_rice': { ovr: 87, pot: 89, attributes: { pace: 76, shooting: 71, passing: 82, dribbling: 79, defending: 86, physical: 86 } },
  'ars_rice': { ovr: 87, pot: 89, attributes: { pace: 76, shooting: 71, passing: 82, dribbling: 79, defending: 86, physical: 86 } },
  'ars_saliba': { ovr: 88, pot: 92, attributes: { pace: 83, shooting: 40, passing: 78, dribbling: 76, defending: 89, physical: 86 } },
  'ars_gabriel': { ovr: 86, pot: 88, attributes: { pace: 72, shooting: 40, passing: 72, dribbling: 66, defending: 87, physical: 86 } },
  'ars_raya': { ovr: 86, pot: 87, attributes: { pace: 48, shooting: 20, passing: 84, dribbling: 50, defending: 25, physical: 72, goalkeeping: 86 } },
  'ars_kai_havertz': { ovr: 84, pot: 86, attributes: { pace: 82, shooting: 81, passing: 79, dribbling: 83, defending: 55, physical: 80 } },
  'ars_gabriel_martinelli': { ovr: 84, pot: 87, attributes: { pace: 89, shooting: 79, passing: 77, dribbling: 86, defending: 45, physical: 72 } },

  // =========================================================================
  // 6. BAYERN MUNICH
  // =========================================================================
  'bay_harry_kane': { ovr: 90, pot: 90, attributes: { pace: 69, shooting: 93, passing: 84, dribbling: 83, defending: 49, physical: 82 } },
  'bay_kane': { ovr: 90, pot: 90, attributes: { pace: 69, shooting: 93, passing: 84, dribbling: 83, defending: 49, physical: 82 } },
  'bay_jamal_musiala': { ovr: 88, pot: 93, attributes: { pace: 85, shooting: 82, passing: 82, dribbling: 91, defending: 64, physical: 70 } },
  'bay_musiala': { ovr: 88, pot: 93, attributes: { pace: 85, shooting: 82, passing: 82, dribbling: 91, defending: 64, physical: 70 } },
  'bay_joshua_kimmich': { ovr: 87, pot: 87, attributes: { pace: 68, shooting: 72, passing: 88, dribbling: 83, defending: 81, physical: 78 } },
  'bay_kimmich': { ovr: 87, pot: 87, attributes: { pace: 68, shooting: 72, passing: 88, dribbling: 83, defending: 81, physical: 78 } },
  'bay_manuel_neuer': { ovr: 87, pot: 87, attributes: { pace: 56, shooting: 20, passing: 88, dribbling: 50, defending: 25, physical: 80, goalkeeping: 87 } },
  'bay_alphonso_davies': { ovr: 84, pot: 87, attributes: { pace: 95, shooting: 68, passing: 78, dribbling: 84, defending: 76, physical: 78 } },
  'bay_michael_olise': { ovr: 84, pot: 89, attributes: { pace: 83, shooting: 78, passing: 84, dribbling: 87, defending: 50, physical: 68 } },
  'bay_kim_min_jae': { ovr: 84, pot: 85, attributes: { pace: 80, shooting: 36, passing: 68, dribbling: 66, defending: 85, physical: 84 } },

  // =========================================================================
  // 7. PARIS SAINT-GERMAIN
  // =========================================================================
  'psg_achraf_hakimi': { ovr: 85, pot: 86, attributes: { pace: 92, shooting: 76, passing: 80, dribbling: 82, defending: 76, physical: 79 } },
  'psg_hakimi': { ovr: 85, pot: 86, attributes: { pace: 92, shooting: 76, passing: 80, dribbling: 82, defending: 76, physical: 79 } },
  'psg_ousmane_dembele': { ovr: 86, pot: 86, attributes: { pace: 93, shooting: 77, passing: 81, dribbling: 89, defending: 36, physical: 60 } },
  'psg_gianluigi_donnarumma': { ovr: 88, pot: 90, attributes: { pace: 50, shooting: 18, passing: 78, dribbling: 45, defending: 20, physical: 82, goalkeeping: 88 } },
  'psg_vitinha': { ovr: 85, pot: 89, attributes: { pace: 78, shooting: 75, passing: 86, dribbling: 86, defending: 72, physical: 68 } },
  'psg_marquinhos': { ovr: 86, pot: 86, attributes: { pace: 78, shooting: 54, passing: 75, dribbling: 74, defending: 87, physical: 80 } },
  'psg_bradley_barcola': { ovr: 82, pot: 88, attributes: { pace: 89, shooting: 77, passing: 76, dribbling: 85, defending: 35, physical: 66 } },
  'psg_warren_zaire_emery': { ovr: 82, pot: 90, attributes: { pace: 80, shooting: 73, passing: 80, dribbling: 82, defending: 76, physical: 80 } },

  // =========================================================================
  // 8. INTER MILAN
  // =========================================================================
  'int_lautaro_martinez': { ovr: 89, pot: 90, attributes: { pace: 82, shooting: 89, passing: 76, dribbling: 86, defending: 48, physical: 84 } },
  'int_nicolo_barella': { ovr: 87, pot: 88, attributes: { pace: 80, shooting: 76, passing: 84, dribbling: 85, defending: 78, physical: 82 } },
  'int_alessandro_bastoni': { ovr: 87, pot: 90, attributes: { pace: 74, shooting: 40, passing: 83, dribbling: 78, defending: 87, physical: 82 } },
  'int_bastoni': { ovr: 87, pot: 90, attributes: { pace: 74, shooting: 40, passing: 83, dribbling: 78, defending: 87, physical: 82 } },
  'int_hakan_calhanoglu': { ovr: 86, pot: 86, attributes: { pace: 68, shooting: 84, passing: 89, dribbling: 83, defending: 72, physical: 72 } },
  'int_federico_dimarco': { ovr: 84, pot: 85, attributes: { pace: 81, shooting: 76, passing: 86, dribbling: 82, defending: 77, physical: 74 } },
  'int_yann_sommer': { ovr: 87, pot: 87, attributes: { pace: 50, shooting: 15, passing: 82, dribbling: 50, defending: 20, physical: 72, goalkeeping: 87 } },
  'int_marcus_thuram': { ovr: 84, pot: 85, attributes: { pace: 88, shooting: 82, passing: 74, dribbling: 83, defending: 45, physical: 83 } },

  // =========================================================================
  // 9. CHELSEA FC
  // =========================================================================
  'che_palmer': { ovr: 87, pot: 92, attributes: { pace: 82, shooting: 87, passing: 88, dribbling: 87, defending: 55, physical: 72 } },
  'che_cole_palmer': { ovr: 87, pot: 92, attributes: { pace: 82, shooting: 87, passing: 88, dribbling: 87, defending: 55, physical: 72 } },
  'che_caicedo': { ovr: 83, pot: 88, attributes: { pace: 76, shooting: 65, passing: 78, dribbling: 79, defending: 83, physical: 82 } },
  'che_enzo': { ovr: 83, pot: 87, attributes: { pace: 68, shooting: 75, passing: 86, dribbling: 81, defending: 75, physical: 76 } },
  'che_christopher_nkunku': { ovr: 84, pot: 85, attributes: { pace: 82, shooting: 82, passing: 81, dribbling: 87, defending: 62, physical: 68 } },

  // =========================================================================
  // 10. MANCHESTER UNITED
  // =========================================================================
  'utd_bruno_fernandes': { ovr: 87, pot: 87, attributes: { pace: 71, shooting: 85, passing: 89, dribbling: 83, defending: 69, physical: 76 } },
  'utd_matthijs_de_ligt': { ovr: 84, pot: 86, attributes: { pace: 68, shooting: 58, passing: 65, dribbling: 66, defending: 85, physical: 85 } },
  'utd_lisandro_martinez': { ovr: 84, pot: 86, attributes: { pace: 71, shooting: 55, passing: 80, dribbling: 77, defending: 85, physical: 81 } },
  'utd_kobbie_mainoo': { ovr: 81, pot: 90, attributes: { pace: 76, shooting: 72, passing: 81, dribbling: 85, defending: 76, physical: 76 } },
  'utd_alejandro_garnacho': { ovr: 81, pot: 88, attributes: { pace: 88, shooting: 78, passing: 75, dribbling: 84, defending: 35, physical: 64 } },
  'man_united_noussair_mazraoui': { ovr: 81, pot: 82, attributes: { pace: 81, shooting: 67, passing: 79, dribbling: 83, defending: 79, physical: 74 } },

  // =========================================================================
  // 11. SAUDI PRO LEAGUE GIANTS (AL HILAL, AL NASSR, AL ITTIHAD, AL AHLI)
  // =========================================================================
  'nassr_cristiano_ronaldo': { ovr: 86, pot: 86, attributes: { pace: 77, shooting: 89, passing: 75, dribbling: 80, defending: 34, physical: 75 } },
  'ittihad_karim_benzema': { ovr: 86, pot: 86, attributes: { pace: 78, shooting: 87, passing: 82, dribbling: 85, defending: 38, physical: 77 } },
  'hilal_yassine_bono': { ovr: 85, pot: 85, attributes: { pace: 45, shooting: 18, passing: 74, dribbling: 45, defending: 22, physical: 78, goalkeeping: 85 } },
  'hilal_yassine_bounou': { ovr: 85, pot: 85, attributes: { pace: 45, shooting: 18, passing: 74, dribbling: 45, defending: 22, physical: 78, goalkeeping: 85 } },
  'hilal_ruben_neves': { ovr: 84, pot: 85, attributes: { pace: 68, shooting: 76, passing: 87, dribbling: 80, defending: 78, physical: 77 } },
  'hilal_sergej_milinkovic_savic': { ovr: 84, pot: 84, attributes: { pace: 68, shooting: 82, passing: 83, dribbling: 81, defending: 78, physical: 86 } },
  'hilal_joao_cancelo': { ovr: 84, pot: 84, attributes: { pace: 83, shooting: 72, passing: 85, dribbling: 84, defending: 78, physical: 71 } },
  'hilal_kalidou_koulibaly': { ovr: 83, pot: 83, attributes: { pace: 70, shooting: 35, passing: 68, dribbling: 65, defending: 85, physical: 86 } },
  'hilal_aleksandar_mitrovic': { ovr: 82, pot: 82, attributes: { pace: 68, shooting: 84, passing: 69, dribbling: 74, defending: 38, physical: 88 } },
  'hilal_malcom': { ovr: 82, pot: 82, attributes: { pace: 84, shooting: 80, passing: 79, dribbling: 84, defending: 44, physical: 68 } },
  'hilal_salem_al_dawsari': { ovr: 79, pot: 79, attributes: { pace: 82, shooting: 78, passing: 77, dribbling: 82, defending: 48, physical: 70 } },
  'nassr_sadio_mane': { ovr: 83, pot: 83, attributes: { pace: 84, shooting: 81, passing: 77, dribbling: 83, defending: 44, physical: 76 } },
  'nassr_aymeric_laporte': { ovr: 83, pot: 83, attributes: { pace: 64, shooting: 50, passing: 72, dribbling: 68, defending: 84, physical: 81 } },
  'nassr_marcelo_brozovic': { ovr: 82, pot: 82, attributes: { pace: 66, shooting: 73, passing: 83, dribbling: 79, defending: 79, physical: 77 } },
  'nassr_otavio': { ovr: 81, pot: 81, attributes: { pace: 77, shooting: 74, passing: 81, dribbling: 83, defending: 68, physical: 75 } },
  'ittihad_ngolo_kante': { ovr: 84, pot: 84, attributes: { pace: 74, shooting: 66, passing: 76, dribbling: 80, defending: 85, physical: 82 } },
  'ittihad_fabinho': { ovr: 81, pot: 81, attributes: { pace: 60, shooting: 66, passing: 78, dribbling: 76, defending: 82, physical: 81 } },
  'ittihad_moussa_diaby': { ovr: 83, pot: 85, attributes: { pace: 94, shooting: 76, passing: 76, dribbling: 86, defending: 42, physical: 56 } },
  'ittihad_houssine_aouar': { ovr: 79, pot: 80, attributes: { pace: 75, shooting: 76, passing: 81, dribbling: 83, defending: 60, physical: 64 } },
  'ahli_sau_riyad_mahrez': { ovr: 84, pot: 84, attributes: { pace: 78, shooting: 81, passing: 83, dribbling: 87, defending: 36, physical: 58 } },
  'ahli_sau_franck_kessie': { ovr: 82, pot: 82, attributes: { pace: 74, shooting: 74, passing: 76, dribbling: 79, defending: 81, physical: 86 } },
  'ahli_sau_ivan_toney': { ovr: 82, pot: 82, attributes: { pace: 80, shooting: 83, passing: 74, dribbling: 79, defending: 45, physical: 84 } },
  'ahli_sau_roberto_firmino': { ovr: 80, pot: 80, attributes: { pace: 72, shooting: 78, passing: 80, dribbling: 83, defending: 58, physical: 74 } },

  // =========================================================================
  // 12. EGYPTIAN PREMIER LEAGUE STARS & PROS (AL AHLY, ZAMALEK, PYRAMIDS)
  // =========================================================================
  'ahly_emam_ashour': { ovr: 78, pot: 81, attributes: { pace: 78, shooting: 79, passing: 81, dribbling: 81, defending: 72, physical: 79 } },
  'ahly_wissam_abou_ali': { ovr: 78, pot: 82, attributes: { pace: 84, shooting: 82, passing: 72, dribbling: 79, defending: 40, physical: 80 } },
  'ahly_mohamed_el_shenawy': { ovr: 77, pot: 77, attributes: { pace: 46, shooting: 18, passing: 72, dribbling: 45, defending: 22, physical: 80, goalkeeping: 77 } },
  'ahly_marwan_attia': { ovr: 77, pot: 80, attributes: { pace: 74, shooting: 68, passing: 80, dribbling: 76, defending: 78, physical: 80 } },
  'ahly_achraf_dari': { ovr: 77, pot: 80, attributes: { pace: 74, shooting: 45, passing: 70, dribbling: 66, defending: 80, physical: 83 } },
  'ahly_hussein_el_shahat': { ovr: 76, pot: 76, attributes: { pace: 80, shooting: 77, passing: 78, dribbling: 81, defending: 46, physical: 66 } },
  'ahly_percy_tau': { ovr: 77, pot: 77, attributes: { pace: 83, shooting: 76, passing: 76, dribbling: 81, defending: 42, physical: 66 } },
  'ahly_akram_tawfik': { ovr: 76, pot: 78, attributes: { pace: 80, shooting: 64, passing: 73, dribbling: 73, defending: 79, physical: 85 } },
  'ahly_afsha': { ovr: 76, pot: 76, attributes: { pace: 70, shooting: 76, passing: 81, dribbling: 80, defending: 48, physical: 65 } },
  'ahly_yasser_ibrahim': { ovr: 75, pot: 75, attributes: { pace: 68, shooting: 40, passing: 66, dribbling: 60, defending: 78, physical: 82 } },
  'ahly_ramy_rabia': { ovr: 75, pot: 75, attributes: { pace: 66, shooting: 45, passing: 70, dribbling: 62, defending: 78, physical: 80 } },
  'ahly_reda_slim': { ovr: 76, pot: 79, attributes: { pace: 84, shooting: 74, passing: 76, dribbling: 80, defending: 46, physical: 69 } },
  'ahly_taher_mohamed': { ovr: 75, pot: 76, attributes: { pace: 83, shooting: 74, passing: 70, dribbling: 75, defending: 60, physical: 80 } },
  'ahly_omar_kamal': { ovr: 76, pot: 76, attributes: { pace: 82, shooting: 72, passing: 74, dribbling: 75, defending: 73, physical: 76 } },

  'zamalek_zizo': { ovr: 79, pot: 80, attributes: { pace: 85, shooting: 80, passing: 82, dribbling: 83, defending: 55, physical: 76 } },
  'zamalek_ahmed_fattouh': { ovr: 76, pot: 78, attributes: { pace: 82, shooting: 68, passing: 76, dribbling: 78, defending: 74, physical: 72 } },
  'zamalek_hossam_abdelmaguid': { ovr: 75, pot: 80, attributes: { pace: 68, shooting: 42, passing: 68, dribbling: 62, defending: 78, physical: 82 } },
  'zamalek_omar_gaber': { ovr: 75, pot: 75, attributes: { pace: 77, shooting: 66, passing: 75, dribbling: 74, defending: 73, physical: 74 } },
  'zamalek_nasser_maher': { ovr: 75, pot: 77, attributes: { pace: 74, shooting: 73, passing: 79, dribbling: 80, defending: 50, physical: 64 } },
  'zamalek_dunga': { ovr: 75, pot: 75, attributes: { pace: 70, shooting: 66, passing: 74, dribbling: 72, defending: 76, physical: 80 } },
  'zamalek_seifeddine_jaziri': { ovr: 75, pot: 75, attributes: { pace: 80, shooting: 76, passing: 68, dribbling: 75, defending: 42, physical: 74 } },
  'zamalek_mohamed_awad': { ovr: 75, pot: 75, attributes: { pace: 46, shooting: 16, passing: 68, dribbling: 42, defending: 20, physical: 72, goalkeeping: 75 } },

  'pyramids_mostafa_fathi': { ovr: 77, pot: 77, attributes: { pace: 83, shooting: 78, passing: 79, dribbling: 84, defending: 44, physical: 64 } },
  'pyramids_ramadan_sobhi': { ovr: 77, pot: 78, attributes: { pace: 79, shooting: 76, passing: 77, dribbling: 82, defending: 52, physical: 78 } },
  'pyramids_fiston_mayele': { ovr: 77, pot: 77, attributes: { pace: 82, shooting: 80, passing: 68, dribbling: 76, defending: 40, physical: 82 } },
  'pyramids_blati_toure': { ovr: 77, pot: 78, attributes: { pace: 76, shooting: 68, passing: 77, dribbling: 77, defending: 79, physical: 83 } },
  'pyramids_walid_el_karti': { ovr: 76, pot: 76, attributes: { pace: 72, shooting: 74, passing: 80, dribbling: 78, defending: 70, physical: 74 } },
  'pyramids_ibrahim_adel': { ovr: 77, pot: 83, attributes: { pace: 85, shooting: 78, passing: 75, dribbling: 82, defending: 42, physical: 70 } },
  'pyramids_mohamed_chibi': { ovr: 77, pot: 77, attributes: { pace: 83, shooting: 66, passing: 81, dribbling: 78, defending: 75, physical: 76 } },
  'pyramids_ahmed_el_shenawy': { ovr: 75, pot: 75, attributes: { pace: 46, shooting: 18, passing: 70, dribbling: 45, defending: 20, physical: 74, goalkeeping: 75 } },
};
