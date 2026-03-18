import './globals.css';

export const metadata = {
  title: 'Adonis — Life Protocol OS',
  description: 'Optimize every domain of your life',
  manifest: '/manifest.json',
  themeColor: '#060709',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
