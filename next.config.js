// 2026-07 repo split: the ADVNCE Labs back office moved to the advncelabs
// repo (admin.advncelabs.com). Every moved path 308-redirects there —
// permanently. Links in already-sent emails (invoices, unsubscribe,
// recruitment tracking) depend on these. NEVER remove them.
const ADMIN_HOST = 'https://admin.advncelabs.com';

const MOVED_PAGE_TREES = ['/admin', '/ambassador', '/ambassadors'];

const MOVED_API_ROUTES = [
  'admin', 'admin-auth', 'ambassador-apply', 'ambassador-content-digest',
  'ambassador-images', 'ambassador-message', 'ambassador-past-customers',
  'ambassador-payout', 'ambassador-welcome', 'ambassador-write',
  'compound-email-draft-list', 'compound-email-draft-write', 'compound-email-generate',
  'compound-email-preview', 'compound-email-resume', 'compound-email-send',
  'discount-code-write', 'email-unsub', 'inventory', 'inventory-adjust',
  'inventory-adjustments', 'inventory-loss-stats', 'invoice-get', 'invoice-list',
  'invoice-stats', 'invoice-transition', 'invoice-write', 'jorrel-os', 'me',
  'notify', 'notify-customer', 'order-customer-update', 'order-status',
  'orders', 'orders-list', 'past-customers', 'payment-reminder', 'place-order',
  'presell-cancel', 'presell-po-placed', 'presell-queue', 'product-write',
  'purchase-receive', 'purchase-write', 'recruitment-application-write',
  'recruitment-click', 'rewards-announce', 'shipping-confirm',
  'social-image-proxy', 'social-post-write', 'subscribe-welcome-2',
  'subscribe-welcome-3', 'subscribers-admin', 'support-tickets',
  'vendor-prices-write', 'vendor-write',
];

const MOVED_CRONS = ['welcome-emails', 'reorder-reminders', 'news-scrape', 'news-curate', 'recruitment-drip'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/index.html',
        permanent: false,
      },
      ...MOVED_PAGE_TREES.flatMap((p) => [
        { source: p, destination: `${ADMIN_HOST}${p}`, permanent: true },
        { source: `${p}/:path*`, destination: `${ADMIN_HOST}${p}/:path*`, permanent: true },
      ]),
      ...MOVED_API_ROUTES.flatMap((r) => [
        { source: `/api/${r}`, destination: `${ADMIN_HOST}/api/${r}`, permanent: true },
        { source: `/api/${r}/:path*`, destination: `${ADMIN_HOST}/api/${r}/:path*`, permanent: true },
      ]),
      ...MOVED_CRONS.map((c) => (
        { source: `/api/cron/${c}`, destination: `${ADMIN_HOST}/api/cron/${c}`, permanent: true }
      )),
    ];
  },
  // Mirrors the vercel.json rewrite for /app: vercel.json only applies to the
  // Vercel edge, so `next start` (local verification, `npm run dev`) needs its
  // own rewrite to serve the v2 SPA shell at /app.
  async rewrites() {
    return [
      {
        source: '/app',
        destination: '/app/index.html',
      },
    ];
  },
};

module.exports = nextConfig;
