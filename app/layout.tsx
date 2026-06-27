import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triagem de Artigos",
  description:
    "Triagem de artigos por título e abstract para revisão sistemática (incluso / não incluso).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
