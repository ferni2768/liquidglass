import "./globals.css";

export const metadata = {
  title: "Liquid Glass",
  description: "Demo of a Liquid Glass effect",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
