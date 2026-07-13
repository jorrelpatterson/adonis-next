/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The recruitment-drip cron shells out to scripts/send-recruitment-drip.js,
    // which dynamically imports the renderer + reads the HTML templates via fs.
    // Vercel's tracer can't follow exec'd scripts or fs string paths, so these
    // must be force-bundled into the function or the cron fails at runtime with
    // "Cannot find module .../lib/renderRecruitmentEmail.js".
    outputFileTracingIncludes: {
      '/api/cron/recruitment-drip': [
        './scripts/send-recruitment-drip.js',
        './lib/renderRecruitmentEmail.js',
        './lib/unsubToken.js',
        './templates/email/recruitment-*.html',
      ],
    },
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/index.html',
        permanent: false,
      },
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
