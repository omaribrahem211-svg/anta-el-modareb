import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';

export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const DICTIONARY: Record<string, { ar: string; en: string }> = {
  // Navigation & Tabs
  'tab_dashboard': { ar: 'الرئيسية', en: 'Dashboard' },
  'tab_squad': { ar: 'التشكيلة', en: 'Squad' },
  'tab_tactics': { ar: 'التكتيك', en: 'Tactics' },
  'tab_matches': { ar: 'المباريات', en: 'Matches' },
  'tab_league': { ar: 'الدوري', en: 'League' },
  'tab_transfers': { ar: 'الانتقالات', en: 'Transfers' },
  'tab_training': { ar: 'التدريب', en: 'Training' },
  'tab_club': { ar: 'النادي', en: 'Club' },
  'tab_career': { ar: 'مسيرتي', en: 'Career' },
  'tab_rankings': { ar: 'التصنيف العالمي', en: 'World Rankings' },
  'tab_inbox': { ar: 'الوارد', en: 'Inbox' },
  'tab_pvp': { ar: 'أونلاين PvP', en: 'PvP Online' },

  // Header & General
  'unemployed_manager': { ar: 'مدرب حر (بدون نادٍ)', en: 'Free Agent Manager' },
  'tier': { ar: 'درجة', en: 'Tier' },
  'season': { ar: 'الموسم', en: 'Season' },
  'round': { ar: 'الجولة', en: 'Round' },
  'available_for_hire': { ar: 'متاح للتعاقد', en: 'Available for Hire' },
  'budget': { ar: 'الخزينة', en: 'Budget' },
  'level': { ar: 'المستوى', en: 'Level' },
  'reputation': { ar: 'السمعة', en: 'Reputation' },
  'season_ended': { ar: 'الموسم انتهى', en: 'Season Ended' },
  'match': { ar: 'المباراة', en: 'Match' },
  'review_season': { ar: 'مراجعة الموسم', en: 'Season Review' },
  'egp': { ar: 'ج.م', en: 'EGP' },

  // Match Screen
  'match_preview': { ar: 'تقديم المباراة والمقارنة الفنية', en: 'Match Preview & Technical Analysis' },
  'start_match': { ar: 'بدء المباراة', en: 'Start Match' },
  'play_round_match': { ar: 'خوض مباراة الجولة الآن', en: 'Play Matchday Now' },
  'simulate_round': { ar: 'محاكاة نتائج الجولة', en: 'Simulate Round' },
  'home_team': { ar: 'المضيف', en: 'Home' },
  'away_team': { ar: 'الضيف', en: 'Away' },
  'your_team': { ar: 'فريقك', en: 'Your Club' },
  'manager_vs_manager': { ar: 'صراع المدربين الفني', en: 'Manager Head-to-Head' },
  'manager_name': { ar: 'المدرب', en: 'Manager' },
  'manager_strength': { ar: 'قوة المدرب', en: 'Manager Strength' },
  'manager_ranking': { ar: 'التصنيف العالمي للمدرب', en: 'World Rank' },
  'manager_points': { ar: 'نقاط التقييم', en: 'Ranking Points' },
  'preferred_formation': { ar: 'التشكيل المفضل', en: 'Fav. Formation' },
  'tactical_style': { ar: 'الأسلوب التكتيكي', en: 'Tactical Style' },
  'squad_strength_title': { ar: 'مقارنة قوة التشكيل الأساسي', en: 'Starting XI Strength Breakdown' },
  'overall_strength': { ar: 'القوة الإجمالية', en: 'Overall Strength' },
  'attack': { ar: 'الهجوم', en: 'Attack' },
  'midfield': { ar: 'الوسط', en: 'Midfield' },
  'defense': { ar: 'الدفاع', en: 'Defense' },
  'goalkeeping': { ar: 'حراسة المرمى', en: 'Goalkeeping' },
  'bench_strength': { ar: 'دكة البدلاء', en: 'Bench Strength' },
  
  // Probabilities & Chances
  'match_chances': { ar: 'حظوظ وتوقعات نتيجة اللقاء', en: 'Match Prediction & Win Probabilities' },
  'home_win_chance': { ar: 'فوز المضيف', en: 'Home Win' },
  'draw_chance': { ar: 'تعادل', en: 'Draw' },
  'away_win_chance': { ar: 'فوز الضيف', en: 'Away Win' },
  'tactical_edge_home': { ar: 'أفضلية للمضيف بفضل عامل الأرض وقوة التشكيل', en: 'Home advantage & superior squad rating' },
  'tactical_edge_away': { ar: 'الضيف مرشح بقوة بفضل التفوق الفني وخبرة المدرب', en: 'Away team favored by technical strength' },
  'tactical_edge_balanced': { ar: 'مواجهة متكافئة وحذرة للغاية بين الفريقين', en: 'Evenly matched fixture with close odds' },

  // Live Match
  'halftime': { ar: 'استراحة الشوطين (45\')', en: 'Half-time (45\')' },
  'fulltime': { ar: 'نهاية المباراة 90\'', en: 'Full-time 90\'' },
  'possession': { ar: 'استحواذ', en: 'Possession' },
  'shots': { ar: 'إجمالي التسديدات', en: 'Total Shots' },
  'shots_on_target': { ar: 'التسديدات على المرمى', en: 'Shots on Target' },
  'dangerous_attacks': { ar: 'الهجمات الخطيرة', en: 'Dangerous Attacks' },
  'corners': { ar: 'الضربات الركنية', en: 'Corners' },
  'fouls': { ar: 'الأخطاء المرتكبة', en: 'Fouls' },
  'yellow_cards': { ar: 'البطاقات الصفراء', en: 'Yellow Cards' },
  'commentary': { ar: 'شريط التعليق الصوتي وأحداث اللقاء', en: 'Live Match Commentary' },
  'make_sub': { ar: 'إجراء تبديل', en: 'Substitution' },
  'skip_to_end': { ar: 'تخطي للنهاية', en: 'Skip to End' },
  'continue_2nd_half': { ar: 'استئناف الشوط الثاني', en: 'Resume 2nd Half' },
  'finish_and_advance': { ar: 'إنهاء المباراة والعودة للوحة القيادة', en: 'Finish & Return to Dashboard' },

  // World Rankings
  'fifa_world_rankings': { ar: 'تصنيف الفيفا والإحصاء العالمي للأندية والمدربين', en: 'FIFA & IFFHS World Rankings' },
  'world_rank_title': { ar: 'مركزك التدريبي عالمياً', en: 'Global World Rank' },
  'top_club_world': { ar: 'الأول عالمياً (أندية)', en: 'World #1 Club' },
  'top_manager_world': { ar: 'الأول عالمياً (مدربون)', en: 'World #1 Manager' },

  // Cloud & Free Tier
  'cloud_sync_optimized': { ar: 'المزامنة السحابية الذكية (خطة مجانية)', en: 'Smart Cloud Sync (Free Tier Eco)' },
  'cloud_save_now': { ar: 'حفظ سحابي فوري', en: 'Cloud Save Now' },
  'cloud_saved_success': { ar: 'تم الحفظ السحابي بنجاح!', en: 'Saved to Cloud Successfully!' },
  'saving': { ar: 'جاري الحفظ...', en: 'Saving...' },
  'language_toggle': { ar: 'اللغة / Language', en: 'Language / اللغة' },
  'switch_to_en': { ar: 'English', en: 'English' },
  'switch_to_ar': { ar: 'العربية', en: 'Arabic' },

  // Scouting & Non-Matchday
  'not_match_day_title': { ar: 'اليوم غير مخصص للمباريات - فترة الإعداد والتكتيك', en: 'Non-Match Day - Tactical Preparation Phase' },
  'advance_to_match': { ar: 'التقدم السريع لموعد المباراة ⏩', en: 'Fast-Forward to Matchday ⏩' },
  'advance_one_day': { ar: 'محاكاة اليوم التالي ➔', en: 'Simulate Next Day ➔' },
  'coach_tips_title': { ar: 'نصائح المدرب الفنية للمباراة القادمة', en: 'Coach Pre-Match Tactical Advice' },
  'spy_scout_title': { ar: 'التجسس الكشفي على المنافس 🕵️‍♂️ (100 ألف ج.م)', en: 'Opponent Tactical Spy Scouting (100k EGP)' },
  'request_spy_report': { ar: 'طلب تقرير التجسس الشامل (100,000 ج.م) 🕵️‍♂️', en: 'Order Opponent Spy Report (100,000 EGP) 🕵️‍♂️' },
  'spy_report_ready': { ar: 'تقرير التجسس والتكتيك السري للمنافس 📑', en: 'Confidential Opponent Scouting Report 📑' },
  'invite_friend_title': { ar: 'دعوة صديق 🎁 (1,000,000 ج.م)', en: 'Invite Friends 🎁 (1,000,000 EGP)' },
  'claim_reward_1m': { ar: 'استلام 1,000,000 ج.م 💰', en: 'Claim 1,000,000 EGP 💰' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'anta_elmodareb_lang_v1';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const language: Language = 'ar';

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  const setLanguage = () => {};
  const toggleLanguage = () => {};

  const t = (key: string, defaultText?: string): string => {
    const entry = DICTIONARY[key];
    if (entry) {
      return entry.ar;
    }
    return defaultText || key;
  };

  const isRTL = true;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
