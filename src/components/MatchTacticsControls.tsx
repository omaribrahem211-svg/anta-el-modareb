import React from 'react';
import type { TacticalStyle, TeamTactics } from '../types/game';

export const MATCH_STYLE_OPTIONS: [TacticalStyle, string][] = [
  ['possession_control', 'استحواذ'], ['tiki_taka', 'تيكي تاكا'], ['counter_attack', 'مرتدات'],
  ['gegenpress', 'ضغط عكسي'], ['wing_play', 'لعب الأطراف'], ['direct_play', 'لعب مباشر'],
  ['park_the_bus', 'تكتل دفاعي'], ['total_football', 'كرة شاملة'],
  ['catenaccio','كاتيناتشو'], ['transition_control','تحكم في التحولات'], ['fluid_creative','إبداع وحرية'],
  ['long_ball','كرات طويلة'], ['build_up_from_back','بناء من الخلف'], ['fast_transition','تحولات سريعة'],
  ['fluid_positional_play','تمركز مرن'], ['tactical_mastermind','تنوع تكتيكي'],
];

/** Same tactics values are consumed by the league and international live engine. */
export const MatchTacticsControls: React.FC<{
  tactics: TeamTactics; onChange: (value: TeamTactics) => void; styleOnly?: boolean;
}> = ({ tactics, onChange, styleOnly = false }) => {
  const select = (field: keyof TeamTactics, label: string, options: [string, string][]) => (
    <label className="block space-y-1 text-xs text-slate-300" key={field}>
      <span>{label}</span>
      <select aria-label={label} value={String(tactics[field] || options[0][0])}
        onChange={e => onChange({ ...tactics, [field]: e.target.value })}
        className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white">
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
  return <div className={styleOnly ? 'pt-2 border-t border-slate-800' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
    {!styleOnly && <>
      {select('formation', 'الخطة', ['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2','4-1-4-1'].map(v=>[v,v]))}
      {select('mentality', 'العقلية', [['ultra_defensive','دفاع حديدي'],['defensive','دفاعي'],['balanced','متوازن'],['attacking','هجومي'],['ultra_attacking','هجوم كاسح']])}
      {select('pressingIntensity', 'حدة الضغط', [['low','منخفض'],['balanced','متوازن'],['high','عالي'],['gegenpress','ضغط عكسي']])}
    </>}
    {select('tacticalStyle', 'أسلوب المباراة', MATCH_STYLE_OPTIONS)}
  </div>;
};
