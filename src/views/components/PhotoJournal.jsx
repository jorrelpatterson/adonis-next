// PhotoJournal — progress photo capture + storage with date watermark.
//
// Flow:
//   1. Tap "Add photo" → file input (camera or library on mobile)
//   2. Image is read, drawn to canvas with brand watermark (date + logo
//      monogram in lower-right corner)
//   3. Result saved as base64 string in logs.progressPhotos[]
//   4. Grid renders thumbnails sorted desc by date; tap opens lightbox
//
// Storage note: storing base64 in localStorage will balloon the db. For
// production we'd swap this to Supabase Storage. For MVP/v2-revival, it
// goes into the logs blob — Supabase handles compression and the photos
// list is pruned to the most recent 30 to keep the row size sane.

import React, { useRef, useState } from 'react';
import { P, FN, FD, FM } from '../../design/theme';
import { s } from '../../design/styles';
import { GradText } from '../../design/components';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';
import EmptyState from '../../design/EmptyState';
import { IllusFood } from '../../design/illustrations';

const MAX_PHOTOS = 30;

function ymd(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Read a File → Image → canvas with watermark → base64 PNG.
async function watermarkImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  // Constrain max dimension to 1280px (mobile photos are huge).
  const MAX = 1280;
  const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  // Watermark — bottom-right corner: A monogram in gold + date below.
  const padding = Math.max(16, w * 0.025);
  const monoSize = Math.max(28, w * 0.045);
  const dateSize = Math.max(12, w * 0.018);

  ctx.save();
  // Soft shadow behind so it reads on light + dark photos.
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;

  // Gold A
  ctx.fillStyle = '#E8D5B7';
  ctx.font = `300 italic ${monoSize}px "Cormorant Garamond", Georgia, serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('A', w - padding, h - padding - dateSize - 4);

  // Date below
  ctx.shadowBlur = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${dateSize}px "JetBrains Mono", monospace`;
  ctx.fillText(formatDate(new Date().toISOString()).toUpperCase(), w - padding, h - padding);

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function PhotoJournal({ logs, log }) {
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const inputRef = useRef(null);

  const photos = Array.isArray(logs?.progressPhotos) ? logs.progressPhotos : [];

  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const watermarked = await watermarkImage(file);
      const next = [
        { date: ymd(new Date()), iso: new Date().toISOString(), data: watermarked },
        ...photos,
      ].slice(0, MAX_PHOTOS);
      log?.('progressPhotos', next);
      sound.success();
      haptics.success();
    } catch (err) {
      console.error('Photo upload failed', err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (iso) => {
    const next = photos.filter(p => p.iso !== iso);
    log?.('progressPhotos', next);
    setLightbox(null);
    sound.toggleOff();
    haptics.light();
  };

  return (
    <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD }}>Progress Journal</div>
          <div style={{ fontFamily: FD, fontSize: 18, fontStyle: 'italic', fontWeight: 300, color: P.txS, marginTop: 2 }}>
            <GradText>Photo Timeline</GradText>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            padding: '8px 14px', borderRadius: 100,
            background: 'linear-gradient(135deg,#E8D5B7,#C9B89A,#B8C4D0)',
            color: '#0A0B0E', fontFamily: FN, fontSize: 11, fontWeight: 700,
            letterSpacing: 0.5, border: 'none', cursor: 'pointer', minHeight: 32,
            opacity: busy ? 0.5 : 1,
            boxShadow: '0 4px 12px rgba(232,213,183,0.18), 0 1px 0 0 rgba(255,255,255,0.3) inset',
          }}
        >
          {busy ? 'Processing…' : '+ Add'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelect}
          style={{ display: 'none' }}
        />
      </div>

      {photos.length === 0 ? (
        <EmptyState
          illustration={<IllusFood />}
          size={100}
          headline="No photos yet"
          body="Take a weekly progress shot. They auto-stamp with date and the Adonis monogram for shareable receipts."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map(p => (
            <button
              key={p.iso}
              onClick={() => { sound.tap(); haptics.light(); setLightbox(p); }}
              style={{
                aspectRatio: '1 / 1',
                background: `url(${p.data}) center/cover`,
                border: 'none', borderRadius: 10,
                cursor: 'pointer', padding: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(232,213,183,0.06) inset',
              }}
              aria-label={`Photo from ${formatDate(p.iso)}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 11000,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FN, padding: 16,
            animation: 'vt-fade-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <img
            src={lightbox.data}
            alt={`Progress on ${formatDate(lightbox.iso)}`}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '92vw', maxHeight: '70vh',
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              animation: 'springScale 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          />
          <div style={{
            position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8,
          }}>
            <div style={{
              padding: '8px 14px', borderRadius: 100,
              background: 'rgba(20,22,30,0.85)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(232,213,183,0.1)',
              fontFamily: FM, fontSize: 11, color: P.txS, fontWeight: 600,
            }}>
              {formatDate(lightbox.iso)}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(lightbox.iso); }}
              style={{
                padding: '8px 14px', borderRadius: 100,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#EF4444', fontFamily: FN, fontSize: 11, fontWeight: 700,
                letterSpacing: 0.5, cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
