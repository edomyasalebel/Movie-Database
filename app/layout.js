// app/layout.js
import '../styles/globals.css';

export const metadata = {
  title: 'MovieDiary',
  description: 'Track what you watch. Rate what you love.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* set theme before React hydrates to avoid flash and mismatch */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
