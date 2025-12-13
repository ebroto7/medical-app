import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import {
  Archivo_Black,
  Space_Grotesk,
  IBM_Plex_Mono,
  Knewave
} from "next/font/google";

// Display font - for headings
const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display"
});

// Body font - for text
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

// Mono font - for code/labels
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono"
});

// Logo font - Knewave
const knewave = Knewave({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-logo"
});

export const metadata: Metadata = {
  title: "Medical App",
  description: "Medical application for patient and doctor management",
};

const fontVariables = [
  archivoBlack.variable,
  spaceGrotesk.variable,
  ibmPlexMono.variable,
  knewave.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${fontVariables}`}>
      <body className="antialiased h-full min-h-screen bg-background">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
