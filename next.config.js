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
};

module.exports = nextConfig;
