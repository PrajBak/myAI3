"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Square, Menu } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
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
    <div className="flex h-screen font-sans dark:bg-black overflow-hidden">
      <main className="flex-1 flex flex-col h-screen relative min-w-0">
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-4">
          <div className="relative overflow-visible px-4 pt-4 flex items-center gap-2">

            <ChatHeader className="flex-1">
              <ChatHeaderBlock className="justify-center items-center w-full relative">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <p className="tracking-tight ml-2">Chat with {AI_NAME}</p>

                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-0 top-1/2 -translate-y-1/2 gap-2"
                  onClick={handleNewChat}
                >
                  <Plus className="size-4" />
                  New Chat
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 w-full pt-[88px] pb-[150px]">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/50 to-transparent dark:bg-black overflow-visible pt-13">
          <div className="w-full px-5 pt-5 pb-1 items-center flex justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            <div className="max-w-3xl w-full">
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
                        <div className="relative h-13">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-15 pr-15 pl-5 bg-card rounded-[20px]"
                            placeholder="Type your message here..."
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
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;<Link href="/terms" className="underline">Terms of Use</Link>&nbsp;Powered by&nbsp;<Link href="https://ringel.ai/" className="underline">Ringel.AI</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
