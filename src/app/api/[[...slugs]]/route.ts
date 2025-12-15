import { redis } from "@/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import { z } from "zod";
import { Message, realtime } from "@/lib/realtime";

const ROOM_TTL_SECONDS = 60 * 15; // 15 minutes

export const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    console.log("Creating room in API route...");
    const roomId = nanoid(10);

    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

    return { roomId };
  })
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  )
  .delete(
    "/",
    async ({ auth }) => {
      const roomId = auth.roomId;
      await realtime
        .channel(roomId)
        .emit("chat.destroy", { isDestroyed: true });

      await Promise.all([
        redis.del(roomId),
        redis.del(`meta:${roomId}`),
        redis.del(`messages:${roomId}`),
      ]);
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      const roomExists = redis.exists(`meta:${roomId}`);

      if (!roomExists) {
        throw new Error("Room does not exist");
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        roomId,
        timestamp: Date.now(),
      };

      // add message to history
      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });
      await realtime.channel(roomId).emit("chat.message", message);

      // housekeeping
      const remainingTTL = await redis.ttl(`meta:${roomId}`);

      await redis.expire(
        `messages:${roomId}`,
        remainingTTL || ROOM_TTL_SECONDS
      );
      await redis.expire(`history:${roomId}`, remainingTTL || ROOM_TTL_SECONDS);
      await redis.expire(roomId, remainingTTL || ROOM_TTL_SECONDS);
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );
      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? m.token : undefined,
        })),
      };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  );

export const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;
