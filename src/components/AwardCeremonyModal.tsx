import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useGame } from '../context/GameContext';
import { shareCoachCardImage } from '../utils/coachCardImageGenerator';

const PHOTO_KEY = 'anta_elmodareb_coach_photo_v1';

// All colours are hard-coded hex values on purpose: the cards are captured as images and must look identical on every phone.
export const AwardCeremonyModal: React.FC = () => {
  const { awardCeremony, dismissAwardCeremony } = useGame() as any;
  const items: any[] = awardCeremony || [];
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    try { setPhoto(localStorage.getItem(PHOTO_KEY)); } catch { /* */ }
  }, [items.length]);

  if (items.length === 0) return null;

  const season = items[0]?.seasonNumber;
  const ordered = [...items].sort((a, b) => (a.scope === b.scope ? (a.kind === 'coach' ? -1 : 1) : a.scope === 'world' ? -1 : 1));
  const userWins = items.filter(i => i.isUser).length;

  const share = async (item: any) => {
    const el = refs.current[item.id];
    if (!el || busyId) return;
    setBusyId(item.id); setMsg('');
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0f172a' });
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `anta-el-modareb-award-${item.id}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      await shareCoachCardImage(
        { dataUrl, blob, file, fileName },
        item.title,
        `🏆 ${item.winnerName} — ${item.title} (موسم ${item.seasonNumber}) في لعبة «أنت المدرب»! تعالى جرّبها وشوف هتوصل لفين 💪`
      );
    } catch (e) {
      console.warn('[Award] share failed', e);
      setMsg('تعذّرت المشاركة، جرّب مرة تانية');
    } finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-y-auto" dir="rtl" style={{ background: '#020617' }}>
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '22px 16px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 40 }}>🏅</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fde047' }}>جوائز الموسم {season}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {userWins > 0 ? `🎉 مبروك يا كابتن! حصلت على ${userWins} ${userWins === 1 ? 'جائزة' : 'جوائز'}` : 'أفضل المدربين واللاعبين هذا الموسم'}
          </div>
        </div>

        {ordered.map(item => {
          const isWorld = item.scope === 'world';
          const isCoach = item.kind === 'coach';
          const mine = !!item.isUser;
          const gold = isWorld ? '#fde047' : '#fbbf24';
          const bg = isWorld
            ? 'linear-gradient(160deg,#1e1b4b 0%,#312e81 50%,#0f172a 100%)'
            : 'linear-gradient(160deg,#052e16 0%,#14532d 50%,#0f172a 100%)';
          const initial = (item.winnerName || '?').trim().charAt(0);
          return (
            <div key={item.id} style={{ marginBottom: 18 }}>
              <div
                ref={el => { refs.current[item.id] = el; }}
                style={{ background: bg, border: `${mine ? 3 : 1.5}px solid ${mine ? gold : '#334155'}`, borderRadius: 26, padding: '20px 16px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box', boxShadow: mine ? `0 0 24px rgba(251,191,36,0.35)` : 'none' }}
              >
                <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ fontSize: 11, color: gold, fontWeight: 800 }}>{isWorld ? '🌍 جوائز العالم' : '🌟 جوائز القارة'} • موسم {item.seasonNumber}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: gold, marginTop: 6 }}>{isWorld ? '🏆' : '🥇'} {item.title}</div>

                <div style={{ margin: '14px auto 8px', width: 92, height: 92, borderRadius: '50%', border: `3px solid ${mine ? gold : '#64748b'}`, overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isCoach && mine && photo ? (
                    <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: isCoach ? 40 : 38, fontWeight: 900, color: mine ? gold : '#cbd5e1' }}>{isCoach ? initial : '⚽'}</span>
                  )}
                </div>

                <div style={{ fontSize: 19, fontWeight: 900 }}>{item.winnerName}{mine ? ' (أنت)' : ''}</div>
                {item.clubName ? <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 2 }}>{isCoach ? 'مدرب ' : ''}{item.clubName}</div> : null}
                <div style={{ marginTop: 10, display: 'inline-block', padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{item.detail}</div>
                {item.prize > 0 && mine ? (
                  <div style={{ marginTop: 10, fontSize: 14, fontWeight: 900, color: '#4ade80' }}>💰 +{Number(item.prize).toLocaleString('en-US')} ج.م في محفظتك الشخصية</div>
                ) : null}
                <div style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>⚽ لعبة «أنت المدرب»</div>
              </div>
              {mine ? (
                <button onClick={() => share(item)} disabled={!!busyId} className="w-full active:scale-95" style={{ marginTop: 8, padding: '12px 0', borderRadius: 16, background: gold, color: '#0f172a', fontWeight: 900, fontSize: 14, opacity: busyId ? 0.6 : 1 }}>
                  {busyId === item.id ? 'جاري التجهيز...' : '📤 شارك الجائزة'}
                </button>
              ) : null}
            </div>
          );
        })}

        {msg ? <div style={{ color: '#fca5a5', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{msg}</div> : null}
        <button onClick={() => dismissAwardCeremony()} className="w-full active:scale-95" style={{ padding: '14px 0', borderRadius: 16, background: '#1e293b', color: '#fff', fontWeight: 900, fontSize: 15, border: '1px solid #334155' }}>
          متابعة
        </button>
      </div>
    </div>
  );
};
