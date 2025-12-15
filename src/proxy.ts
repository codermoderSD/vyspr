import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid";

export const proxy = async (req: NextRequest) => {
  const path = req.nextUrl.pathname;

  const roomMatch = path.match(/^\/room\/([^\/]+)$/);

  if (!roomMatch) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const roomId = roomMatch[1];

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    `meta:${roomId}`
  );

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room_not_found", req.url));
  }

  const existingTokens = req.cookies.get("x-auth-token")?.value;

  // user is allowed to join
  if (existingTokens && meta.connected?.includes(existingTokens)) {
    return NextResponse.next();
  }

  // Block adding tokens for bot requests / preview crawlers / non-navigations
  const ua = req.headers.get("user-agent") || "";
  const secFetchDest = req.headers.get("sec-fetch-dest");
  const secFetchMode = req.headers.get("sec-fetch-mode");

  const isLikelyBot =
    /bot|crawler|spider|facebookexternalhit|discordbot|twitterbot|slackbot|whatsapp|telegram/i.test(
      ua
    );
  const isNavigation =
    secFetchDest === "document" ||
    secFetchMode === "navigate" ||
    req.method === "GET";

  if (!isNavigation || isLikelyBot) {
    // don't allocate a slot for non-user navigations or bots — just allow but don't set cookie
    return NextResponse.next();
  }

  // user is not allowed to join
  if ((meta.connected || []).length >= 3) {
    return NextResponse.redirect(new URL("/?error=room_full", req.url));
  }

  const response = NextResponse.next();

  const token = nanoid();

  response.cookies.set(`x-auth-token`, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  await redis.hset(`meta:${roomId}`, {
    connected: [...(meta.connected || []), token],
  });

  return response;
};

export const config = {
  matcher: "/room/:path*",
};
