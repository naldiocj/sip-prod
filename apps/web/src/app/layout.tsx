import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIP",
  description: "Sistema de Informação de Processos"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
