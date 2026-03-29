// app/layout.js
import '../styles/globals.css';

export const metadata = {
  title: 'MovieDiary',
  description: 'Track what you watch. Rate what you love.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
