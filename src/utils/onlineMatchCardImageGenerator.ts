import { toPng } from 'html-to-image';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface MatchScorerItem {
  name: string;
  minute: number;
  team: 'host' | 'guest';
}

export interface OnlineMatchCardData {
  roomCode: string;
  hostManagerName: string;
  hostClubName: string;
  hostAvatar?: string | null;
  guestManagerName: string;
  guestClubName: string;
  guestAvatar?: string | null;
  homeScore: number;
  awayScore: number;
  scorers: MatchScorerItem[];
  matchRecap: string;
  dateStr?: string;
  cardElement?: HTMLElement | null;
}

export interface GeneratedMatchCardResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  fileName: string;
}

/**
 * Generates an image of the Online Challenge Match Result Card.
 * Uses high-resolution DOM capture first, with an advanced Canvas fallback.
 */
export async function generateOnlineMatchCardImage(
  data: OnlineMatchCardData
): Promise<GeneratedMatchCardResult> {
  const safeHost = (data.hostClubName || 'Home').replace(/[^\w\u0600-\u06FF]/g, '_');
  const safeGuest = (data.guestClubName || 'Away').replace(/[^\w\u0600-\u06FF]/g, '_');
  const fileName = `نتيجة_تحدي_${safeHost}_ضد_${safeGuest}_${Date.now()}.png`;

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // 1. Try DOM capture if cardElement is provided
  if (data.cardElement) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));

      const dataUrl = await toPng(data.cardElement, {
        cacheBust: true,
        pixelRatio: 2.2,
        backgroundColor: '#030712',
        skipFonts: true,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (
              node.getAttribute('data-hide-on-export') === 'true' ||
              node.classList.contains('hide-on-export')
            ) {
              return false;
            }
          }
          return true;
        },
      });

      if (dataUrl && dataUrl.length > 500) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        return { dataUrl, blob, file, fileName };
      }
    } catch (domErr) {
      console.warn('[MatchShareCard] DOM capture notice, falling back to Canvas rendering:', domErr);
    }
  }

  // 2. High-Fidelity Canvas Fallback
  return generateCanvasMatchCard(data, fileName);
}

/**
 * Canvas renderer for ultra-crisp sports broadcast card (1200x800)
 */
async function generateCanvasMatchCard(
  data: OnlineMatchCardData,
  fileName: string
): Promise<GeneratedMatchCardResult> {
  const width = 1200;
  const height = 800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Background Gradient: Deep Night Pitch
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.4, '#06281e');
  bgGrad.addColorStop(0.7, '#0b192c');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle Pitch Lines in center
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2 - 20, 140, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2, 40);
  ctx.lineTo(width / 2, height - 120);
  ctx.stroke();

  // Outer Border Glow
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Inner Subtle Golden Accent Line
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Top Header Banner: Required Slogan (Replaces room code & English name)
  const headerGrad = ctx.createLinearGradient(40, 40, width - 80, 110);
  headerGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  headerGrad.addColorStop(0.5, 'rgba(20, 184, 166, 0.35)');
  headerGrad.addColorStop(1, 'rgba(16, 185, 129, 0.25)');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, 40, 40, width - 80, 70, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'black 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🏆 حمل لعبة أنت المدرب واتحدى أصحابك ⚽', width / 2, 85);

  // Middle Section: Host vs Guest
  // HOST (Right side in Arabic RTL)
  const hostCenterX = width * 0.78;
  const guestCenterX = width * 0.22;
  const teamY = 220;

  // Host Avatar Box / Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(hostCenterX, teamY, 45, 0, Math.PI * 2);
  ctx.fillStyle = '#065f46';
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Host Initial or Avatar Icon
  ctx.fillStyle = '#ecfdf5';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(data.hostClubName.charAt(0) || 'H', hostCenterX, teamY + 12);

  // Host Names
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(data.hostClubName, hostCenterX, teamY + 75);

  ctx.fillStyle = '#34d399';
  ctx.font = 'normal 18px system-ui, sans-serif';
  ctx.fillText(`المدرب: ${data.hostManagerName}`, hostCenterX, teamY + 105);

  // GUEST (Left side in Arabic RTL)
  ctx.save();
  ctx.beginPath();
  ctx.arc(guestCenterX, teamY, 45, 0, Math.PI * 2);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#eff6ff';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(data.guestClubName.charAt(0) || 'G', guestCenterX, teamY + 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(data.guestClubName, guestCenterX, teamY + 75);

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'normal 18px system-ui, sans-serif';
  ctx.fillText(`المدرب: ${data.guestManagerName}`, guestCenterX, teamY + 105);

  // SCOREBOARD (Center)
  const scoreCenterY = teamY + 10;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  roundRect(ctx, width / 2 - 130, scoreCenterY - 60, 260, 110, 20);
  ctx.fill();
  ctx.stroke();

  // Score numbers
  ctx.fillStyle = '#34d399';
  ctx.font = 'black 64px monospace, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'ltr';
  ctx.fillText(`${data.homeScore}`, width / 2 - 25, scoreCenterY + 18);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('-', width / 2, scoreCenterY + 10);

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'black 64px monospace, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${data.awayScore}`, width / 2 + 25, scoreCenterY + 18);

  // Status Badge below score
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('نهاية المباراة (FULL TIME)', width / 2, scoreCenterY + 40);

  // SCORERS SECTION
  const scorersY = 380;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  roundRect(ctx, 120, scorersY, width - 240, 100, 16);
  ctx.fill();

  const hostScorers = data.scorers.filter((s) => s.team === 'host');
  const guestScorers = data.scorers.filter((s) => s.team === 'guest');

  // Host Scorers (Right)
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  const hostScorersText = hostScorers.length > 0
    ? hostScorers.map((s) => `⚽ ${s.name} (${s.minute}')`).join(' • ')
    : 'لم يسجل أهدافاً';
  ctx.fillText(hostScorersText, width - 150, scorersY + 40);

  // Guest Scorers (Left)
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#e2e8f0';
  const guestScorersText = guestScorers.length > 0
    ? guestScorers.map((s) => `⚽ ${s.name} (${s.minute}')`).join(' • ')
    : 'لم يسجل أهدافاً';
  ctx.fillText(guestScorersText, 150, scorersY + 40);

  // Center divider for scorers
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2, scorersY + 15);
  ctx.lineTo(width / 2, scorersY + 85);
  ctx.stroke();

  // MATCH RECAP (نبذة عن سير اللقاء)
  const recapY = 505;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
  roundRect(ctx, 80, recapY, width - 160, 120, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText('📋 ملخص وسير اللقاء:', width - 110, recapY + 34);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'normal 15px system-ui, sans-serif';
  wrapArabicText(ctx, data.matchRecap, width - 110, recapY + 66, width - 220, 24);

  // FOOTER BANNER: REQUIRED CALL TO ACTION
  const footerY = 660;
  const footerGrad = ctx.createLinearGradient(80, footerY, width - 80, footerY + 90);
  footerGrad.addColorStop(0, '#059669');
  footerGrad.addColorStop(0.5, '#10b981');
  footerGrad.addColorStop(1, '#047857');
  ctx.fillStyle = footerGrad;
  roundRect(ctx, 60, footerY, width - 120, 85, 20);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'black 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🔥 حمل لعبة أنت المدرب واتحدى أصحابك 🔥', width / 2, footerY + 42);

  ctx.fillStyle = '#d1fae5';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('لعبة تدريب كرة القدم العربية الأولى • خطط، تكتيكات، وتحديات أونلاين حية', width / 2, footerY + 68);

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: 'image/png' });

  return { dataUrl, blob, file, fileName };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapArabicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

/**
 * Downloads the card as a PNG image file
 */
export async function downloadMatchCardFile(dataUrl: string, fileName: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const writeResult = await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true,
      });

      if (writeResult?.uri) {
        return true;
      }
    }

    // Web fallback
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.warn('[MatchShareCard] Direct download failed, falling back to blob anchor:', err);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Shares the match result card via native OS share sheet or web share
 */
export async function shareMatchCard(
  dataUrl: string,
  fileName: string,
  title: string,
  text: string
): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const savedFile = await Filesystem.writeFile({
        path: `cache_${fileName}`,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        text,
        url: savedFile.uri,
        dialogTitle: 'مشاركة نتيجة التحدي المباشر',
      });
      return true;
    }

    // Modern Web Share API with image file
    if (navigator.canShare && typeof File !== 'undefined') {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return true;
      }
    }

    if (navigator.share) {
      await navigator.share({
        title,
        text: `${text}\n${title}`,
      });
      return true;
    }

    // Clipboard fallback
    await navigator.clipboard.writeText(`${title}\n${text}`);
    return true;
  } catch (err) {
    console.warn('[MatchShareCard] Share API fallback notice:', err);
    return false;
  }
}
