// app/wholesale/page.jsx
import WholesaleForm from './WholesaleForm';

export const metadata = {
  title: 'Wholesale — advnce labs',
  description: 'Wholesale inquiry for advnce labs.',
};

export default function WholesalePage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <div
        style={{
          minHeight: '100vh',
          background: '#050507',
          color: '#E8E4E0',
          fontFamily: "'Outfit', sans-serif",
          padding: '64px 24px',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <header style={{ marginBottom: 40, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 28,
                color: '#E8D5B7',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              advnce labs
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#5A5856',
              }}
            >
              Wholesale Inquiry
            </div>
          </header>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: '#9C9A94',
              marginBottom: 40,
              textAlign: 'center',
            }}
          >
            Tell us about your business. We review applications within 1–2 business days. If
            approved, you'll receive your login code and current pricing sheet by email.
          </p>

          <WholesaleForm
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
          />

          <footer
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: '1px solid rgba(232,213,183,0.1)',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#5A5856',
              textAlign: 'center',
              lineHeight: 2,
            }}
          >
            Lead time 7–14 business days · Minimum order 10 units per SKU
          </footer>
        </div>
      </div>
    </>
  );
}
