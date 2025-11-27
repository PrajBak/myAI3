"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { AI_NAME, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = 'chat-sessions';

type StoredSessionData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
};

type StorageData = {
  sessions: ChatSession[];
  data: Record<string, StoredSessionData>;
};

const loadStorage = (): StorageData => {
  if (typeof window === 'undefined') return { sessions: [], data: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Migration check: check for old single-chat storage
      const oldMessages = localStorage.getItem('chat-messages');
      if (oldMessages) {
        const parsedOld = JSON.parse(oldMessages);
        const initialId = Date.now().toString();
        const initialSession: ChatSession = { id: initialId, title: "Previous Chat", createdAt: Date.now() };
        const initialData: StorageData = {
          sessions: [initialSession],
          data: {
            [initialId]: {
              messages: parsedOld.messages || [],
              durations: parsedOld.durations || {},
            }
          }
        };
        return initialData;
      }
      return { sessions: [], data: {} };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return { sessions: [], data: {} };
  }
};

const saveStorage = (data: StorageData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});

  // Initialize storage on mount
  useEffect(() => {
    setIsClient(true);
    const stored = loadStorage();
    if (stored.sessions.length > 0) {
      const mostRecent = stored.sessions[0];
      setMessages(stored.data[mostRecent.id]?.messages || []);
      setDurations(stored.data[mostRecent.id]?.durations || {});
    } else {
      // Set welcome message if no storage
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: WELCOME_MESSAGE }],
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const welcomeMessage: UIMessage = {
      id: `welcome-${newId}`,
      role: "assistant",
      parts: [{ type: "text", text: WELCOME_MESSAGE }],
    };

    setMessages([welcomeMessage]);
    setDurations({});

    // Clear storage effectively by saving a new single session
    const newSession: ChatSession = { id: newId, title: "New Chat", createdAt: Date.now() };
    const newData = { [newId]: { messages: [welcomeMessage], durations: {} } };
    saveStorage({ sessions: [newSession], data: newData });
  };

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: "single-session",
    messages: [] as UIMessage[],
    onFinish: () => {
      // We don't need to rename chats anymore since it's single session
    }
  });

  // Sync messages to storage
  useEffect(() => {
    if (!isClient) return;
    // Always save as a single session for simplicity in this reverted mode
    // We reuse the existing structure to avoid breaking loadStorage if we revert back later
    const currentId = "current-session";
    const currentSession: ChatSession = { id: currentId, title: "Current Chat", createdAt: Date.now() };

    saveStorage({
      sessions: [currentSession],
      data: { [currentId]: { messages, durations } }
    });
  }, [messages, durations, isClient]);


  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prev) => ({ ...prev, [key]: duration }));
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05030F] text-[#FCF2D6]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,189,120,0.4), transparent 55%), radial-gradient(circle at 80% 10%, rgba(125,106,255,0.25), transparent 55%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen" aria-hidden style={{ backgroundImage: "linear-gradient(120deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-16">
        <main className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col rounded-[36px] border border-white/10 bg-[rgba(13,7,23,0.9)] shadow-[0_30px_120px_rgba(5,3,9,0.85)] backdrop-blur-2xl overflow-hidden">
            <div className="sticky top-0 z-20 px-4 pt-6 sm:px-8 bg-[rgba(13,7,23,0.92)]/90 backdrop-blur">
              <ChatHeader className="items-center justify-between rounded-3xl border border-white/15 bg-white/5 px-5 py-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <ChatHeaderBlock className="items-center gap-4">
                  <Avatar className="size-12 border border-white/15 bg-black/20 shadow-lg shadow-black/50">
                    <AvatarImage src="/logo.png" />
                    <AvatarFallback>
                      <Image src="/logo.png" alt="Logo" width={36} height={36} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-amber-200/80">Product Pulse</span>
                    <p className="text-xl font-semibold tracking-tight text-white">Chat with {AI_NAME}</p>
                  </div>
                </ChatHeaderBlock>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-white/40 bg-gradient-to-r from-[#FFB347] to-[#FF6B6B] text-[#2b0d1c] shadow-lg shadow-[#ff8a5c]/40 hover:opacity-90"
                  onClick={handleNewChat}
                >
                  <Plus className="size-4" />
                  New Chat
                </Button>
              </ChatHeader>
            </div>

            <section className="flex-1 px-4 pb-2 pt-4 sm:px-8 sm:pb-4">
              <div className="relative flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/5">
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
                  {isClient ? (
                    <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                  ) : (
                    <div className="flex justify-center">
                      <Loader2 className="size-5 animate-spin text-amber-200" />
                    </div>
                  )}
                </div>
                {isClient && status === "submitted" && (
                  <div className="border-t border-white/10 px-6 py-3 text-xs uppercase tracking-[0.5em] text-amber-200/80 sm:px-8">
                    <div className="flex items-center gap-3">
                      <Loader2 className="size-4 animate-spin text-amber-200" />
                      Thinking
                    </div>
                  </div>
                )}
              </div>
            </section>

            <footer className="sticky bottom-0 z-20 px-4 pb-6 pt-4 sm:px-8 bg-[rgba(13,7,23,0.92)]/90 backdrop-blur">
              <div className="rounded-[28px] border border-white/15 bg-[#160C2A] p-4 shadow-inner shadow-black/40">
                <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <FieldGroup>
                    <Controller
                      name="message"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="chat-form-message" className="sr-only">
                            Message
                          </FieldLabel>
                          <div className="relative h-16">
                            <Input
                              {...field}
                              id="chat-form-message"
                              className="h-16 w-full rounded-full border-white/20 bg-[#1F1234] px-6 pr-16 text-base text-[#FDF6DE] placeholder:text-white/40 focus:border-amber-200 focus:ring-2 focus:ring-amber-200/40"
                              placeholder="Type your message…"
                              disabled={status === "streaming"}
                              aria-invalid={fieldState.invalid}
                              autoComplete="off"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  form.handleSubmit(onSubmit)();
                                }
                              }}
                            />
                            {(status === "ready" || status === "error") && (
                              <Button
                                className="absolute right-2 top-2 h-12 w-12 rounded-full bg-gradient-to-br from-[#FFB347] to-[#FF6B6B] text-[#2b0d1c] shadow-lg shadow-[#ff8a5c]/40"
                                type="submit"
                                disabled={!field.value.trim()}
                                size="icon"
                              >
                                <ArrowUp className="size-5" />
                              </Button>
                            )}
                            {(status === "streaming" || status === "submitted") && (
                              <Button
                                className="absolute right-2 top-2 h-12 w-12 rounded-full border border-white/30 bg-transparent text-white/80 hover:bg-white/10"
                                size="icon"
                                onClick={() => {
                                  stop();
                                }}
                              >
                                <Square className="size-5" />
                              </Button>
                            )}
                          </div>
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </form>
              </div>
              <div className="mt-4 text-center text-xs text-white/50">
                © {new Date().getFullYear()} {OWNER_NAME} ·{" "}
                <Link href="/terms" className="underline decoration-dotted">
                  Terms of Use
                </Link>{" "}
                · Powered by{" "}
                <Link href="https://ringel.ai/" className="underline decoration-dotted">
                  Ringel.AI
                </Link>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
