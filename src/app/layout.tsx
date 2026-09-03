import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zelcon | Gestão Operacional de Condomínios",
  description: "Plataforma mobile-first para moradores e gestores controlarem manutenções, achados e perdidos e rotinas do condomínio.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var t = localStorage.getItem('zelcore_theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
