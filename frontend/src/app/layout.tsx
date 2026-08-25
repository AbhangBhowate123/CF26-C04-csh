import type { Metadata } from "next";
// Fonts will be loaded via Google Fonts link below
import "./globals.css";

export const metadata: Metadata = {
  title: "Threat Reconstruction Dashboard",
  description: "Aegis Mission Control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-on-surface font-body-default min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
