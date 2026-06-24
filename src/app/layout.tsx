import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crea Torneos",
  description: "Crea y administra torneos de ajedrez con rondas, pareos y resultados claros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

