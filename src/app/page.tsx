"use client";

import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Lobby />
    </Suspense>
  );
};

function Lobby() {
  const { username } = useUsername();
  const router = useRouter();
  const searchParams = useSearchParams();
  const destroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post();

      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`);
      }
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {destroyed ? (
          <div className="bg-red-950/50 text-red-900 border border-red-900 p-4 text-center rounded-md">
            <p className="text-red-500 text-sm font-bold">ROOM DESTROYED</p>
            <p className="text-zinc-500 text-xs mt-1">
              All messages have been permanently deleted.
            </p>
          </div>
        ) : null}
        {error === "room_not_found" ? (
          <div className="bg-red-950/50 text-red-900 border border-red-900 p-4 text-center rounded-md">
            <p className="text-red-500 text-sm font-bold">ROOM NOT FOUND</p>
            <p className="text-zinc-500 text-xs mt-1">
              The room you are trying to access is either destroyed or does not
              exist.
            </p>
          </div>
        ) : null}
        {error === "room_full" ? (
          <div className="bg-red-950/50 text-red-900 border border-red-900 p-4 text-center rounded-md">
            <p className="text-red-500 text-sm font-bold">ROOM FULL</p>
            <p className="text-zinc-500 text-xs mt-1">
              The room you are trying to access is full.
            </p>
          </div>
        ) : null}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-teal-500">
            {"> "}VYSPR
          </h1>
          <p className="text-zinc-500 text-sm">
            A secure and private self-destructing chat app
          </p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center text-zinc-500">
                Your Identity
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                  {username}
                </div>
              </div>
            </div>
            <button
              className="w-full bg-zinc-100 text-black font-bold p-3 text-sm hover:g-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
              onClick={() => createRoom()}
            >
              Create Secure Room
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Page;
