import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triagem de Artigos",
  description:
    "Triagem de artigos por título e abstract para revisão sistemática (incluso / não incluso).",
};

// Aplica o tema antes da pintura, evitando flash de tema errado (FOUC).
const themeInit = `(function(){try{
  var t = localStorage.getItem('theme');
  var d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', d);
}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
