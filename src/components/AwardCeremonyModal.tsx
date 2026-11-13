import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useGame } from '../context/GameContext';
import { shareCoachCardImage } from '../utils/coachCardImageGenerator';

const PHOTO_KEY = 'anta_elmodareb_coach_photo_v1';

// All colours are hard-coded hex values on purpose: the card is captured as an image and must look identical on every phone.
export const AwardCeremonyModal: React.FC = () => {
  const { awardCeremony, dismissAwardCeremony } = useGame() as any;
  const item = (awardCeremony || [])[0];
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    try { setPhoto(localStorage.getItem(PHOTO_KEY)); } catch { /* */ }
  }, [item?.id]);

  if (!item) return null;

  const isWorld = item.scope === 'world';
  const isCoach = item.kind === 'coach';
  const gold = isWorld ? '#fde047' : '#fbbf24';
  const bg = isWorld
    ? 'linear-gradient(160deg,#1e1b4b 0%,#312e81 45%,#0f172a 100%)'
    : 'linear-gradient(160deg,#052e16 0%,#14532d 45%,#0f172a 100%)';
  const initial = (item.winnerName || '?').trim().charAt(0);

  const share = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true); setMsg('');
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0f172a' });
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
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex flex-col items-center justify-center p-4 gap-4 overflow-y-auto" dir="rtl" style={{ background: 'rgba(2,6,23,0.96)' }}>
      <div
        ref={cardRef}
        style={{ width: '100%', maxWidth: 340, background: bg, border: `3px solid ${gold}`, borderRadius: 28, padding: '26px 20px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}
      >
        <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -70, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ fontSize: 12, letterSpacing: 1, color: gold, fontWeight: 800 }}>
          {isWorld ? '🌍 جوائز العالم' : '🌟 جوائز القارة'} • موسم {item.seasonNumber}
        </div>
        <div style={{ fontSize: 54, lineHeight: 1.1, marginTop: 10 }}>{isWorld ? '🏆' : '🥇'}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: gold, marginTop: 6 }}>{item.title}</div>

        <div style={{ margin: '18px auto 10px', width: 120, height: 120, borderRadius: '50%', border: `4px solid ${gold}`, overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 6px rgba(255,255,255,0.08)` }}>
          {isCoach && photo ? (
            <img src={photo} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 56, fontWeight: 900, color: gold }}>{isCoach ? initial : '⚽'}</span>
          )}
        </div>

        <div style={{ fontSize: 22, fontWeight: 900 }}>{item.winnerName}</div>
        {item.clubName ? <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 2 }}>{item.clubName}</div> : null}
        <div style={{ marginTop: 12, display: 'inline-block', padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{item.detail}</div>
        {item.prize > 0 ? (
          <div style={{ marginTop: 14, fontSize: 15, fontWeight: 900, color: '#4ade80' }}>💰 +{Number(item.prize).toLocaleString('en-US')} ج.م في محفظتك الشخصية</div>
        ) : null}

        <div style={{ marginTop: 18, fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>⚽ لعبة «أنت المدرب»</div>
      </div>

      <div className="flex gap-3 w-full" style={{ maxWidth: 340 }}>
        <button onClick={share} disabled={busy} className="flex-1 py-3.5 rounded-2xl font-black text-sm active:scale-95" style={{ background: gold, color: '#0f172a', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'جاري التجهيز...' : '📤 مشاركة'}
        </button>
        <button onClick={() => dismissAwardCeremony()} className="flex-1 py-3.5 rounded-2xl font-black text-sm active:scale-95" style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
          {(awardCeremony || []).length > 1 ? 'التالي' : 'متابعة'}
        </button>
      </div>
      {msg ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{msg}</div> : null}
    </div>
  );
};
