import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const jestbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "vyspr",
  description: "A secure and private self-destructing chat app",
  keywords: [
    "chat",
    "secure chat",
    "private messaging",
    "self-destructing messages",
    "encrypted chat",
    "vyspr",
    "vyspr chat",
  ],
  authors: [{ name: "Shubham Dalvi", url: "https://shubhamdalvi.in" }],
  openGraph: {
    title: "vyspr",
    description: "A secure and private self-destructing chat app",
    url: "https://vyspr.shubhamdalvi.in",
    siteName: "vyspr",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "vyspr",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jestbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
