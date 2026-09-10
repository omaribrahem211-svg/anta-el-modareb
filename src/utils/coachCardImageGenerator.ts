import { ManagerProfile, Club } from '../types/game';

interface GenerateCardOptions {
  manager: ManagerProfile;
  userClub: Club | null;
  globalRank: number;
  winRate: number;
  photoUrl: string | null;
}

/**
 * Generates a high-resolution, broadcast-quality PNG image of the Official Coach Card
 * suitable for downloading and sharing on WhatsApp Stories, Facebook, Instagram, etc.
 */
export async function generateCoachCardImage(options: GenerateCardOptions): Promise<{ dataUrl: string; blob: Blob }> {
  const { manager, userClub, globalRank, winRate, photoUrl } = options;

  // High-resolution canvas dimensions (portrait 1080 x 1420)
  const width = 1080;
  const height = 1420;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Helper for drawing rounded rectangle
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 1. Dark Luxurious Background
  const bgGrad = ctx.createRadialGradient(width / 2, 350, 50, width / 2, height / 2, 900);
  bgGrad.addColorStop(0, '#1e293b'); // Slate 800
  bgGrad.addColorStop(0.5, '#0f172a'); // Slate 900
  bgGrad.addColorStop(1, '#020617'); // Slate 950
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle tactical grid background pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Outer Golden Card Frame
  const margin = 40;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardRadius = 48;

  // Outer glow
  ctx.save();
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 40;
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 6;
  roundRect(margin, margin, cardW, cardH, cardRadius);
  ctx.stroke();
  ctx.restore();

  // Inner Card Border (Double line gold foil effect)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  roundRect(margin + 12, margin + 12, cardW - 24, cardH - 24, cardRadius - 8);
  ctx.stroke();

  // Top Holographic Gradient Bar
  const topGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin);
  topGrad.addColorStop(0, '#f59e0b');
  topGrad.addColorStop(0.5, '#10b981');
  topGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = topGrad;
  ctx.fillRect(margin + 20, margin + 14, cardW - 40, 8);

  // 2. Card Header Pill ("لعبة أنت المدرب")
  const headerPillY = margin + 60;
  ctx.save();
  const pillGrad = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
  pillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
  pillGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
  pillGrad.addColorStop(1, 'rgba(245, 158, 11, 0.25)');
  ctx.fillStyle = pillGrad;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  roundRect(width / 2 - 240, headerPillY, 480, 56, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px system-ui, -apple-system, "Segoe UI", Roboto, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ كارت المدرب الرسمي • أنت المدرب ✨', width / 2, headerPillY + 28);
  ctx.restore();

  // 3. Coach Photo (or placeholder avatar)
  const photoSize = 280;
  const photoX = (width - photoSize) / 2;
  const photoY = headerPillY + 90;

  // Photo Frame Outer Glow & Border
  ctx.save();
  ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  roundRect(photoX, photoY, photoSize, photoSize, 36);
  ctx.stroke();
  ctx.restore();

  // Draw Photo Content (clipped inside rounded rect)
  ctx.save();
  roundRect(photoX, photoY, photoSize, photoSize, 36);
  ctx.clip();

  let photoDrawn = false;
  if (photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = photoUrl;
      });
      ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
      photoDrawn = true;
    } catch {
      photoDrawn = false;
    }
  }

  if (!photoDrawn) {
    // Default avatar gradient background
    const avatarBg = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
    avatarBg.addColorStop(0, '#1e293b');
    avatarBg.addColorStop(1, '#0f172a');
    ctx.fillStyle = avatarBg;
    ctx.fillRect(photoX, photoY, photoSize, photoSize);

    // Draw coach avatar silhouette / text
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚽', photoX + photoSize / 2, photoY + photoSize / 2 - 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px system-ui, "Cairo", sans-serif';
    ctx.fillText('صورة المدرب', photoX + photoSize / 2, photoY + photoSize / 2 + 65);
  }
  ctx.restore();

  // 4. Coach Name & Club
  const nameY = photoY + photoSize + 60;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px system-ui, -apple-system, "Segoe UI", Roboto, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.fillText(manager.name, width / 2, nameY);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px system-ui, "Cairo", sans-serif';
  const clubTitle = `المدير الفني • ${userClub?.name || 'دوري الدرجة الرابعة'}`;
  ctx.fillText(clubTitle, width / 2, nameY + 48);
  ctx.restore();

  // 5. Primary Info Grid (الدولة, العمر, الترتيب العالمي)
  const gridY = nameY + 95;
  const gridH = 140;
  const gridMargin = margin + 40;
  const gridW = width - gridMargin * 2;
  const colW = gridW / 3;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  roundRect(gridMargin, gridY, gridW, gridH, 24);
  ctx.fill();
  ctx.stroke();

  // Column 1: Nationality
  const col1X = gridMargin + colW / 2;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌍 الدولة', col1X, gridY + 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 32px system-ui, "Cairo", sans-serif';
  ctx.fillText(manager.nationality || 'مصر', col1X, gridY + 92);

  // Column 2: Age
  const col2X = gridMargin + colW + colW / 2;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px system-ui, "Cairo", sans-serif';
  ctx.fillText('📅 العمر', col2X, gridY + 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 32px system-ui, "Cairo", sans-serif';
  ctx.fillText(`${manager.age || 35} سنة`, col2X, gridY + 92);

  // Column 3: Global Rank
  const col3X = gridMargin + colW * 2 + colW / 2;
  ctx.fillStyle = '#fbbf24';
  ctx.font = '22px system-ui, "Cairo", sans-serif';
  ctx.fillText('🏆 الترتيب العالمي', col3X, gridY + 42);
  ctx.fillStyle = '#fcd34d';
  ctx.font = '900 36px system-ui, "Cairo", sans-serif';
  ctx.fillText(`#${globalRank}`, col3X, gridY + 92);

  // Column dividers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gridMargin + colW, gridY + 20);
  ctx.lineTo(gridMargin + colW, gridY + gridH - 20);
  ctx.moveTo(gridMargin + colW * 2, gridY + 20);
  ctx.lineTo(gridMargin + colW * 2, gridY + gridH - 20);
  ctx.stroke();
  ctx.restore();

  // 6. Secondary Stats Strip (المباريات, نسبة الفوز, البطولات)
  const stripY = gridY + gridH + 25;
  const stripH = 120;

  ctx.save();
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.lineWidth = 2;
  roundRect(gridMargin, stripY, gridW, stripH, 20);
  ctx.fill();
  ctx.stroke();

  // Stat 1: Matches
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px system-ui, "Cairo", sans-serif';
  ctx.fillText('المباريات الملعوبة', col1X, stripY + 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`${manager.matchesManaged}`, col1X, stripY + 84);

  // Stat 2: Win Rate
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px system-ui, "Cairo", sans-serif';
  ctx.fillText('نسبة الفوز', col2X, stripY + 40);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`${winRate}%`, col2X, stripY + 84);

  // Stat 3: Trophies
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px system-ui, "Cairo", sans-serif';
  ctx.fillText('البطولات المحققة', col3X, stripY + 40);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`${manager.trophies || 0} 🏆`, col3X, stripY + 84);
  ctx.restore();

  // 7. Slogan Banner ("🔥 حَمّل لعبة أنت المدرب وشوف قدراتك التدريبية!")
  const sloganY = stripY + stripH + 30;
  const sloganH = 80;

  ctx.save();
  const sloganGrad = ctx.createLinearGradient(gridMargin, 0, gridMargin + gridW, 0);
  sloganGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
  sloganGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
  sloganGrad.addColorStop(1, 'rgba(245, 158, 11, 0.25)');
  ctx.fillStyle = sloganGrad;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  roundRect(gridMargin, sloganY, gridW, sloganH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥 حَمّل لعبة أنت المدرب وشوف قدراتك التدريبية! ⚽', width / 2, sloganY + sloganH / 2);
  ctx.restore();

  // 8. Footer Official Watermark & License
  const footerY = sloganY + sloganH + 40;
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = '20px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('رخصة تدريب معتمدة • أنت المدرب 2026 • Real Football Simulation', width / 2, footerY);
  ctx.restore();

  // Convert to Data URL & Blob
  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob from canvas'));
    }, 'image/png', 0.95);
  });

  return { dataUrl, blob };
}
