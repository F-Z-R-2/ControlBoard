import "@excalidraw/excalidraw/index.css";
import "@livekit/components-styles";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Manuel Scorza — Campus virtual",
    template: "%s | Manuel Scorza",
  },
  description:
    "Campus virtual de la I. E. 40122 Manuel Scorza, Cerro Juli. Aprendizaje, acompañamiento y bienestar para nuestra comunidad educativa.",
  applicationName: "Manuel Scorza",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
