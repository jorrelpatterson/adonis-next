'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';

const s = {
  h1: { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  sub: { color:'#8C919E', marginBottom:32, fontSize:14 },
  card: {
    background:'#fff', borderRadius:8, border:'1px solid #E4E7EC',
    padding:24, textDecoration:'none', display:'block',
    transition:'transform 0.12s, box-shadow 0.12s',
  },
  thumb: {
    height:160, borderRadius:6, marginBottom:16,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic',
    color:'#F4F2EE', fontSize:22, padding:'0 24px', textAlign:'center',
    lineHeight:1.2,
  },
  meta: { fontSize:10, color:'#4A4F5C', fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:'uppercase' },
  title: { fontSize:16, fontWeight:700, color:'#0F1928', marginTop:8, marginBottom:4 },
  desc: { fontSize:13, color:'#8C919E', lineHeight:1.4 },
  pill: {
    display:'inline-block', fontSize:9, padding:'2px 8px',
    background:'#E6FBFC', color:'#00808a', borderRadius:3,
    letterSpacing:1, textTransform:'uppercase', fontWeight:600,
    marginTop:12,
  },
  back: { fontSize:12, color:'#0072B5', textDecoration:'none', marginBottom:16, display:'inline-block' },
  helpBox: {
    background:'#F9FAFB', border:'1px solid #E4E7EC', borderRadius:6,
    padding:16, marginTop:32, fontSize:13, color:'#4A4F5C', lineHeight:1.6,
  },
};

const carousels = [
  {
    id: 'long-term-effects',
    href: '/social-images/long-term-effects-carousel.html',
    title: 'Long-Term Effects · Carousel',
    desc: 'Edgy 6-slide carousel — peptide unknowns vs. obesity literature. Editorial cream/navy palette, RUO-safe.',
    slides: '6 slides · 1080×1080',
    tone: 'Edgy / Editorial',
    thumbBg: '#0A0D14',
    thumbText: '"The unknown is uncomfortable.\nThe known is worse."',
    created: '2026-04-27',
  },
  {
    id: 'long-term-effects-single',
    href: '/social-images/long-term-effects-single.html',
    title: 'Long-Term Effects · Single',
    desc: '"What are the long-term effects?" · Of peptides? Unknown. · Of obesity? Known. — followed by 9 visceral stats clustered For Men · Mortality · Disease.',
    slides: '1 image · 1080×1350',
    tone: 'Edgy / Editorial',
    thumbBg: '#0A0D14',
    thumbText: '"The known is worse."',
    created: '2026-04-27',
  },
];

export default function PostBuilder() {
  return (
    <div>
      <Link href="/admin/marketing" style={s.back}>← Marketing</Link>
      <h1 className="admin-page-h1" style={s.h1}>Post Builder</h1>
      <p style={s.sub}>Pre-built Instagram carousels — click to render and download as 1080×1080 PNGs.</p>

      <div className="admin-tile-row">
        {carousels.map(c => (
          <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" style={s.card}>
            <div style={{ ...s.thumb, background:c.thumbBg }}>
              {c.thumbText.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div style={s.meta}>{c.slides} · {c.tone}</div>
            <div style={s.title}>{c.title}</div>
            <div style={s.desc}>{c.desc}</div>
            <div style={s.pill}>Open renderer</div>
          </a>
        ))}
      </div>

      <div style={s.helpBox}>
        <strong style={{ color:'#0F1928' }}>How it works</strong>
        <div style={{ marginTop:8 }}>
          1. Click a carousel above — opens the renderer in a new tab.<br/>
          2. Wait ~3 seconds for brand fonts to load (Barlow, Cormorant, JetBrains Mono).<br/>
          3. Click <em>Download all</em> — saves the full slide set to your <code style={{ background:'#fff', padding:'1px 4px', borderRadius:2 }}>~/Downloads/</code> folder.<br/>
          4. Drag the PNGs into Instagram in slide order. Disclaimer goes in the caption, not on the image.
        </div>
        <div style={{ marginTop:12, fontSize:11, color:'#8C919E' }}>
          Need a new carousel? The HTML files live in <code style={{ background:'#fff', padding:'1px 4px', borderRadius:2 }}>public/social-images/</code> — duplicate one and modify the slides.
        </div>
      </div>
    </div>
  );
}
