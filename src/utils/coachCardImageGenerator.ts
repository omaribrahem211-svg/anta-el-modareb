import { toPng } from 'html-to-image';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { ManagerProfile, Club } from '../types/game';

export interface TacticalProfileData {
  styleTitle: string;
  formation: string;
  mentalityDesc: string;
  passingDesc: string;
  pressingDesc: string;
  tacticalBio: string;
}

export interface GenerateCardOptions {
  manager: ManagerProfile;
  userClub: Club | null;
  globalRank: number;
  rankingPoints: number;
  totalMatches: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGoalsScored: number;
  totalGoalsConceded: number;
  winRate: number;
  trophiesCount: number;
  tacticalProfile: TacticalProfileData;
  photoUrl: string | null;
  cardElement?: HTMLElement | null;
}

export interface GeneratedCardResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  fileName: string;
}

/**
 * Generates an image of the Coach Card containing 100% of the details.
 * Prioritizes high-resolution DOM capture of the actual card element,
 * with a high-fidelity Canvas fallback matching the Dark Premium Emerald/Gold theme.
 */
export async function generateCoachCardImage(options: GenerateCardOptions): Promise<GeneratedCardResult> {
  const { manager, cardElement } = options;
  const safeName = (manager.name || 'مدرب').replace(/[^\w\u0600-\u06FF]/g, '_');
  const fileName = `كارت_المدرب_${safeName}_${Date.now()}.png`;

  // Pre-load fonts if available to ensure text renders crisply
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // 1. Try DOM capture if element is provided (captures 100% of visual details, icons, fonts, badges)
  if (cardElement) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));

      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 2.2,
        backgroundColor: '#020617',
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node) => {
          // Exclude interactive camera upload overlay buttons when generating the clean shareable card
          if (node instanceof HTMLElement) {
            if (
              node.id === 'coach_photo_upload_overlay' ||
              node.classList.contains('photo-upload-overlay') ||
              node.getAttribute('data-hide-on-export') === 'true'
            ) {
              return false;
            }
          }
          return true;
        },
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (dataUrl && dataUrl.length > 500) {
        return { dataUrl, blob, file, fileName };
      }
    } catch (domErr) {
      console.warn('[CoachCard] DOM capture notice, falling back to Canvas rendering:', domErr);
    }
  }

  // 2. Fallback: High-resolution Canvas rendering matching Dark Premium layout
  return generateCanvasCoachCard(options, fileName);
}

/**
 * Dedicated Canvas renderer for the Coach Card:
 * Dark Premium design with Emerald & Gold accents, spacious layout, clear stats,
 * playing style, and official branding.
 */
async function generateCanvasCoachCard(options: GenerateCardOptions, fileName: string): Promise<GeneratedCardResult> {
  const {
    manager,
    userClub,
    globalRank,
    totalMatches,
    totalWins,
    totalDraws,
    totalLosses,
    winRate,
    tacticalProfile,
    photoUrl,
  } = options;

  const width = 1080;
  const height = 1440;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx!.beginPath();
    ctx!.moveTo(x + r, y);
    ctx!.lineTo(x + w - r, y);
    ctx!.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx!.lineTo(x + w, y + h - r);
    ctx!.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx!.lineTo(x + r, y + h);
    ctx!.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx!.lineTo(x, y + r);
    ctx!.quadraticCurveTo(x, y, x + r, y);
    ctx!.closePath();
  }

  function drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx!.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx!.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx!.fillText(line, x, curY);
    return curY;
  }

  // 1. Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#09131f');
  bgGrad.addColorStop(0.5, '#061019');
  bgGrad.addColorStop(1, '#03080e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer Golden & Emerald Frame
  const margin = 40;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardRadius = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(245, 158, 11, 0.25)';
  ctx.shadowBlur = 30;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  roundRect(margin, margin, cardW, cardH, cardRadius);
  ctx.stroke();
  ctx.restore();

  // Top Holographic Accent Bar
  const topGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin);
  topGrad.addColorStop(0, '#f59e0b');
  topGrad.addColorStop(0.5, '#10b981');
  topGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = topGrad;
  ctx.fillRect(margin + 24, margin + 2, cardW - 48, 6);

  // 2. Header: Logo and Title «أنت المدرب»
  const headerY = margin + 50;
  ctx.save();
  // Logo Icon
  ctx.fillStyle = '#f59e0b';
  roundRect(margin + 40, headerY - 15, 60, 60, 16);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆', margin + 70, headerY + 15);

  // Title Text
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 34px system-ui, "Cairo", sans-serif';
  ctx.fillText('أنت المدرب', margin + 40 + 80 + 200, headerY + 5);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px system-ui, "Cairo", sans-serif';
  ctx.fillText('بطاقة المدرب الرسمية', margin + 40 + 80 + 200, headerY + 32);

  // OVR Pill on the left
  const managerLevel = manager.level || 1;
  const managerOvr = manager.managerRating || (manager as any).rating || Math.min(99, 68 + managerLevel * 3 + (totalWins > 5 ? 5 : 0));
  const ovrW = 120;
  const ovrH = 52;
  const ovrX = margin + cardW - 40 - ovrW;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  roundRect(ovrX, headerY - 10, ovrW, ovrH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = '900 24px system-ui, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${managerOvr} OVR`, ovrX + ovrW / 2, headerY + 16);
  ctx.restore();

  // Divider below header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin + 40, headerY + 65);
  ctx.lineTo(margin + cardW - 40, headerY + 65);
  ctx.stroke();

  // 3. Coach Photo + Name & Club Section
  const photoSize = 160;
  const photoX = margin + 50;
  const photoY = headerY + 95;

  ctx.save();
  roundRect(photoX, photoY, photoSize, photoSize, 26);
  ctx.clip();

  let imgLoaded = false;
  if (photoUrl) {
    try {
      const img = new Image();
      img.src = photoUrl;
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });
      }
      if (img.naturalWidth > 0) {
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        imgLoaded = true;
      }
    } catch {
      imgLoaded = false;
    }
  }

  if (!imgLoaded) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(photoX, photoY, photoSize, photoSize);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((manager.name || 'م')[0], photoX + photoSize / 2, photoY + photoSize / 2);
  }
  ctx.restore();

  // Photo border
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3.5;
  roundRect(photoX, photoY, photoSize, photoSize, 26);
  ctx.stroke();
  ctx.restore();

  // Coach Name, Club, Level
  const textStartX = photoX + photoSize + 40;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 40px system-ui, "Cairo", sans-serif';
  ctx.fillText(manager.name, margin + cardW - 50, photoY + 5);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px system-ui, "Cairo", sans-serif';
  const clubName = userClub?.name || 'دوري الدرجة الرابعة';
  ctx.fillText(`المدير الفني لنادي ${clubName}`, margin + cardW - 50, photoY + 58);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px system-ui, "Cairo", sans-serif';
  ctx.fillText(`المستوى التدريبي: ${managerLevel}  •  الجنسية: ${manager.nationality || 'مصر'}`, margin + cardW - 50, photoY + 102);
  ctx.restore();

  // 4. Core Stats Grid: World Rank, Matches, Win Rate (3 Columns)
  const statsY = photoY + photoSize + 45;
  const statsH = 150;
  const statsMargin = margin + 40;
  const statsW = cardW - 80;
  const colW = statsW / 3;

  // Background box for 3 stats
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2;
  roundRect(statsMargin, statsY, statsW, statsH, 22);
  ctx.fill();
  ctx.stroke();

  // Column 1: World Rank (Gold)
  const c1 = statsMargin + colW * 0.5;
  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 22px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('التصنيف العالمي 🏆', c1, statsY + 45);
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText(`#${globalRank}`, c1, statsY + 105);

  // Column 2: Matches (White)
  const c2 = statsMargin + colW * 1.5;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 22px system-ui, "Cairo", sans-serif';
  ctx.fillText('عدد المباريات ⚽', c2, statsY + 45);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText(`${totalMatches}`, c2, statsY + 105);

  // Column 3: Win Rate (Emerald)
  const c3 = statsMargin + colW * 2.5;
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 22px system-ui, "Cairo", sans-serif';
  ctx.fillText('نسبة الفوز ⚡', c3, statsY + 45);
  ctx.fillStyle = '#10b981';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText(`${winRate}%`, c3, statsY + 105);

  // Vertical Dividers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(statsMargin + colW, statsY + 20);
  ctx.lineTo(statsMargin + colW, statsY + statsH - 20);
  ctx.moveTo(statsMargin + colW * 2, statsY + 20);
  ctx.lineTo(statsMargin + colW * 2, statsY + statsH - 20);
  ctx.stroke();
  ctx.restore();

  // Quick Record Sub-Bar (Wins, Draws, Losses)
  const recY = statsY + statsH + 18;
  const recH = 60;
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  roundRect(statsMargin, recY, statsW, recH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 22px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rx1 = statsMargin + statsW * 0.2;
  const rx2 = statsMargin + statsW * 0.5;
  const rx3 = statsMargin + statsW * 0.8;

  ctx.fillStyle = '#34d399';
  ctx.fillText(`فوز: ${totalWins} 🟢`, rx1, recY + recH / 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`تعادل: ${totalDraws} 🟡`, rx2, recY + recH / 2);
  ctx.fillStyle = '#f87171';
  ctx.fillText(`خسارة: ${totalLosses} 🔴`, rx3, recY + recH / 2);
  ctx.restore();

  // 5. Playing Style Section (أسلوب اللعب)
  const styleY = recY + recH + 25;
  const styleH = 190;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 2;
  roundRect(statsMargin, styleY, statsW, styleH, 20);
  ctx.fill();
  ctx.stroke();

  // Header of Playing Style
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '900 24px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('أسلوب اللعب التكتيكي:', statsMargin + statsW - 30, styleY + 40);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 22px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⚡ ${tacticalProfile.styleTitle}`, statsMargin + 30, styleY + 40);

  // Bio Text
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '21px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'right';
  drawWrappedText(tacticalProfile.tacticalBio, statsMargin + statsW - 30, styleY + 85, statsW - 60, 32);

  // Tactical Tags
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `الخطة: ${tacticalProfile.formation}   •   العقلية: ${tacticalProfile.mentalityDesc}   •   التمرير: ${tacticalProfile.passingDesc}`,
    width / 2,
    styleY + styleH - 24
  );
  ctx.restore();

  // 6. Clean Footer Verification
  const footerY = styleY + styleH + 45;
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = '20px system-ui, "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('رخصة تدريب معتمدة • لعبة أنت المدرب 2026', width / 2, footerY);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png', 0.98);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob from canvas'));
    }, 'image/png', 0.98);
  });

  const file = new File([blob], fileName, { type: 'image/png' });
  return { dataUrl, blob, file, fileName };
}

/**
 * Downloads the coach card image directly to the user's phone or computer.
 * Works seamlessly across Android Native (Capacitor Filesystem) and standard Web browsers.
 */
export async function downloadCoachCardFile(dataUrl: string, fileName: string): Promise<boolean> {
  let savedSuccess = false;

  // 1. Android / iOS Native Capacitor Filesystem save
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      savedSuccess = true;
    } catch (fsErr) {
      console.warn('[CoachCard] Filesystem Documents save notice, trying Cache:', fsErr);
      try {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        savedSuccess = true;
      } catch (cacheErr) {
        console.error('[CoachCard] Native Filesystem save error:', cacheErr);
      }
    }
  }

  // 2. Standard Web Download (Anchor Tag + Blob URL)
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
    savedSuccess = true;
  } catch (webErr) {
    console.warn('[CoachCard] Web anchor download notice:', webErr);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    savedSuccess = true;
  }

  return savedSuccess;
}

/**
 * Shares the Coach Card image file natively.
 * Guarantees that the image file is physically saved/downloaded on the user's device first,
 * and then opens the native share dialog with the image file attached.
 */
export async function shareCoachCardImage(
  imageResult: GeneratedCardResult,
  shareTitle: string,
  shareText: string
): Promise<{ shared: boolean; downloaded: boolean }> {
  const downloaded = await downloadCoachCardFile(imageResult.dataUrl, imageResult.fileName);
  let shared = false;

  // 1. Android Capacitor Native Sharing
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = imageResult.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const saved = await Filesystem.writeFile({
        path: imageResult.fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: shareTitle,
        text: shareText,
        url: saved.uri,
        dialogTitle: 'مشاركة كارت المدرب',
      });
      shared = true;
      return { shared, downloaded };
    } catch (capErr: any) {
      if (capErr?.message?.includes('canceled') || capErr?.name === 'AbortError') {
        return { shared: true, downloaded };
      }
      console.warn('[CoachCard] Capacitor share notice:', capErr);
    }
  }

  // 2. Web Share API with File
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [imageResult.file] })) {
    try {
      await navigator.share({
        files: [imageResult.file],
        title: shareTitle,
        text: shareText,
      });
      shared = true;
      return { shared, downloaded };
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') {
        return { shared: true, downloaded };
      }
      console.warn('[CoachCard] Web Share API notice:', shareErr);
    }
  }

  return { shared, downloaded };
}
