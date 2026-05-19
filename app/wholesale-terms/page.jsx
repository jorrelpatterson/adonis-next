// app/wholesale-terms/page.jsx
export const metadata = {
  title: 'Wholesale Terms — advnce labs',
};

export default function WholesaleTerms() {
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
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
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
              marginBottom: 48,
            }}
          >
            Wholesale Terms
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.8, color: '#E8E4E0', marginBottom: 24 }}>
            Wholesale terms are being finalized. For current terms please email{' '}
            <a href="mailto:wholesale@advncelabs.com" style={{ color: '#E8D5B7' }}>
              wholesale@advncelabs.com
            </a>
            .
          </p>

          <p style={{ fontSize: 12, lineHeight: 1.7, color: '#5A5856', marginTop: 48 }}>
            By submitting a wholesale application, you confirm all products purchased are for
            research or professional use only and will not be administered without appropriate
            licensure. Lead time on wholesale orders is 7–14 business days from confirmed order.
            Minimum order is 10 units per SKU.
          </p>

          <div style={{ marginTop: 64 }}>
            <a
              href="/wholesale"
              style={{
                color: '#E8D5B7',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(232,213,183,0.3)',
                paddingBottom: 2,
              }}
            >
              ← Back to application
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
