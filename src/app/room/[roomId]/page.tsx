"use client";

import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import Spinner from "@/components/Spinner";

const Page = () => {
  const params = useParams();
  const roomId = params.roomId as string;
  const { username } = useUsername();
  const router = useRouter();

  const [copyStatus, setCopyStatus] = useState("COPY");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);

  // Keep a CSS variable for dynamic viewport height (fixes mobile keyboard resizing)
  useEffect(() => {
    const setVh = () => {
      const h =
        (window.visualViewport && window.visualViewport.height) ||
        window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);

      // when viewport changes (keyboard opens), scroll to bottom so input and latest messages are visible
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    };

    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVh);
    }

    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", setVh);
      }
    };
  }, []);

  // When input is focused (keyboard opens on some devices), ensure scroll-to-bottom
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const handler = () => {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    };

    inputEl.addEventListener("focus", handler);
    return () => inputEl.removeEventListener("focus", handler);
  }, [inputRef.current]);

  // Keep container padded to input height to avoid blank scroll area below input on mobile
  useEffect(() => {
    const setPadding = () => {
      const inputH = inputRef.current?.getBoundingClientRect().height || 0;
      if (containerRef.current) {
        // add some extra spacing so messages don't butt right up against the input
        containerRef.current.style.paddingBottom = `${inputH + 20}px`;
      }
    };

    setPadding();

    const resizeObs = () => setPadding();

    window.addEventListener("resize", resizeObs);
    window.addEventListener("orientationchange", resizeObs);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", resizeObs);
    }

    // also update when input's content changes (some keyboards change input height)
    const inputEl = inputRef.current;
    if (inputEl) inputEl.addEventListener("input", setPadding);

    return () => {
      window.removeEventListener("resize", resizeObs);
      window.removeEventListener("orientationchange", resizeObs);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", resizeObs);
      }
      if (inputEl) inputEl.removeEventListener("input", setPadding);
    };
  }, [inputRef.current, containerRef.current]);

  const { data: ttlData } = useQuery({
    queryKey: ["room-ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } });
      return res.data;
    },
  });

  useEffect(() => {
    if (ttlData?.ttl !== undefined) {
      setTimeRemaining(ttlData.ttl);
    }
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } });
      return res.data;
    },
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        {
          sender: username,
          text,
        },
        { query: { roomId } }
      );
    },
    onError: (_err, variables) => {
      // remove pending matching the text on error
      setPendingMessages((prev) =>
        prev.filter((p) => p.text !== variables.text)
      );
    },
    onSettled: () => {
      // ensure we have latest messages
      refetch();
    },
  });

  // When messages from server update, remove matching pending messages and scroll to bottom
  useEffect(() => {
    if (!messages?.messages) return;

    setPendingMessages((prev) =>
      prev.filter(
        (pm) =>
          !messages.messages.some(
            (m: any) => m.text === pm.text && m.sender === pm.sender
          )
      )
    );

    // scroll to bottom when new authoritative messages arrive
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  }, [messages]);

  const destroyRoomMutation = useMutation<void, unknown, void, unknown>({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } });
    },
  });
  const destroyRoomMutate = destroyRoomMutation.mutate;
  const isDestroying = destroyRoomMutation.status === "pending";

  useRealtime({
    channels: [roomId],
    events: ["chat.destroy", "chat.message"],
    onData: ({ event }) => {
      if (event === "chat.message") {
        // refetch messages
        refetch();
        // also scroll to bottom a moment after receiving the message
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        });
      } else if (event === "chat.destroy") {
        // handle room destruction
        router.push("/?destroyed=true");
      }
    },
  });

  const copyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);

    setCopyStatus("COPIED!");
    setTimeout(() => setCopyStatus("COPY"), 2000);
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const pending = {
      id: `pending-${Date.now()}-${Math.random()}`,
      sender: username,
      text,
      timestamp: Date.now(),
      status: "pending",
    };

    setPendingMessages((p) => [...p, pending]);

    // scroll to show pending message
    requestAnimationFrame(() => {
      if (containerRef.current)
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
    });

    sendMessage({ text });
  };

  return (
    <main
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
      className="flex flex-col overflow-hidden min-h-0"
    >
      <header className="sticky top-0 z-20 border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">Room ID</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-teal-500">{roomId}</span>
              <button
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={copyLink}
              >
                {copyStatus}
              </button>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">
              Self-Destruct
            </span>
            <span
              className={`text-sm font-bold flex items-center gap-2 ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-500"
                  : "text-amber-500"
              }`}
            >
              {timeRemaining !== null
                ? formatTimeRemaining(timeRemaining)
                : "--:--"}
            </span>
          </div>
        </div>
        <button
          onClick={() => destroyRoomMutate()}
          disabled={isDestroying}
          className="text-xs bg-zinc-800 hover:bg-red-600 px-2 sm:px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isDestroying ? (
            <>
              <Spinner
                size={14}
                className="text-white"
                aria-label="destroying"
              />
              <span className="hidden sm:inline">Destroying...</span>
            </>
          ) : (
            <>
              <span>💣</span>
              <span className="hidden sm:inline">DESTROY NOW</span>
            </>
          )}
        </button>
      </header>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin"
      >
        {messages?.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm font-mono">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          // render authoritative server messages first
          messages?.messages.map((msg) => (
            <div key={msg.id} className="flex flex-col items-start">
              <div
                className={`max-w-[95%] sm:max-w-[80%] group ${
                  msg.sender === username
                    ? "border border-teal-500/20 bg-teal-500/5 pl-4 pr-4 py-2 rounded-md"
                    : "border border-zinc-800 bg-zinc-900/40 pl-4 pr-4 py-2 rounded-md"
                }`}
              >
                <div className="flex items-baseline gap-3 mb-1 justify-between">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-xs ${
                        msg.sender === username
                          ? "font-semibold text-teal-500"
                          : "font-medium text-amber-200"
                      }`}
                    >
                      {msg.sender === username ? "You" : msg.sender}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-600">
                    {format(new Date(msg.timestamp), "hh:mm a")}
                  </span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {msg.text}
                </p>
              </div>
            </div>
          ))
        )}

        {/* pending optimistic messages (render after server messages) - show on left for better UX */}
        {pendingMessages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start">
            <div className="max-w-[95%] sm:max-w-[80%] group border border-teal-500/10 bg-teal-500/3 pl-4 pr-4 py-2 rounded-md">
              <div className="flex items-baseline gap-3 mb-1 justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-semibold text-teal-500">
                    You
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {format(new Date(msg.timestamp), "hh:mm a")}
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap wrap-break-word opacity-60 italic">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 z-20 p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500">
              {">"}
            </span>
            <input
              type="text"
              placeholder="Type your message..."
              autoFocus={true}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputMessage.trim()) {
                  handleSend(inputMessage.trim());
                  inputRef?.current?.focus();
                  setInputMessage("");
                } else {
                }
              }}
              ref={inputRef}
              className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm rounded"
            />
          </div>
          <button
            onClick={() => {
              handleSend(inputMessage);
              setInputMessage("");
              inputRef?.current?.focus();
            }}
            disabled={!inputMessage.trim() || isPending}
            className="bg-zinc-200 text-zinc-900 px-6 text-sm font-bold hover:bg-zinc-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded flex items-center justify-center"
          >
            {isPending ? (
              <>
                <Spinner
                  size={14}
                  className="text-zinc-900 mr-2"
                  aria-label="sending"
                />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Page;
