import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Medical App",
  description: "Medical application for patient and doctor management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased h-full min-h-screen" style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 25%, #f5f3ff 50%, #faf5ff 75%, #fef3c7 100%)",
        backgroundAttachment: "fixed"
      }}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
