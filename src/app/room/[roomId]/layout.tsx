import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "vyspr",
  description: "A secure and private self-destructing chat app",

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
};

export default function RoomId({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
