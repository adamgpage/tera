import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tera — Human Knowledge, Connected",
  description:
    "Connect with people who have solved the problem you're facing. Real experience, real conversation, matched by AI.",
  manifest: "/manifest.json",
  themeColor: "#14b8a6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tera",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="auto">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-surface text-text-primary antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
