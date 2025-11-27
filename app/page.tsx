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
import { ChatSidebar, ChatSession } from "@/components/chat-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionData, setSessionData] = useState<Record<string, StoredSessionData>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Refs to hold latest state for callbacks/effects to avoid stale closures
  const sessionsRef = useRef(sessions);
  const sessionDataRef = useRef(sessionData);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    sessionDataRef.current = sessionData;
  }, [sessionData]);

  // Initialize storage on mount
  useEffect(() => {
    setIsClient(true);
    const stored = loadStorage();
    setSessions(stored.sessions);
    setSessionData(stored.data);

    if (stored.sessions.length > 0) {
      // Select most recent session
      const mostRecent = stored.sessions.sort((a, b) => b.createdAt - a.createdAt)[0];
      setCurrentSessionId(mostRecent.id);
      setDurations(stored.data[mostRecent.id]?.durations || {});
      setMessages(stored.data[mostRecent.id]?.messages || []);
    } else {
      createNewSession();
    }
  }, []);

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      createdAt: Date.now(),
    };

    const welcomeMessage: UIMessage = {
      id: `welcome-${newId}`,
      role: "assistant",
      parts: [{ type: "text", text: WELCOME_MESSAGE }],
    };

    const newSessions = [newSession, ...sessions];
    const newSessionData = {
      ...sessionData,
      [newId]: { messages: [welcomeMessage], durations: {} }
    };

    setSessions(newSessions);
    setSessionData(newSessionData);
    setCurrentSessionId(newId);
    setDurations({});
    setMessages([welcomeMessage]);
    setIsSidebarOpen(false); // Close mobile sidebar on new chat

    saveStorage({ sessions: newSessions, data: newSessionData });
  };

  const deleteSession = (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    const newSessionData = { ...sessionData };
    delete newSessionData[id];

    setSessions(newSessions);
    setSessionData(newSessionData);
    saveStorage({ sessions: newSessions, data: newSessionData });

    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        const nextSession = newSessions[0];
        setCurrentSessionId(nextSession.id);
        setMessages(newSessionData[nextSession.id].messages);
        setDurations(newSessionData[nextSession.id].durations);
      } else {
        createNewSession();
      }
    }
  };

  const selectSession = (id: string) => {
    if (id === currentSessionId) return;
    setCurrentSessionId(id);
    const data = sessionData[id];
    if (data) {
      setMessages(data.messages);
      setDurations(data.durations);
    }
    setIsSidebarOpen(false); // Close mobile sidebar on selection
  };

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: currentSessionId || "default",
    messages: [] as UIMessage[],

    onFinish: (message) => {
      // Update session title if it's the first user message
      const currentSessions = sessionsRef.current;
      const session = currentSessions.find(s => s.id === currentSessionId);

      if (session && session.title === "New Chat") {
        const userMsg = messages.find(m => m.role === 'user');
        if (userMsg) {
          const text = userMsg.parts.filter(p => p.type === 'text').map(p => p.text).join('').slice(0, 30);
          const updatedSessions = currentSessions.map(s =>
            s.id === currentSessionId ? { ...s, title: text || "New Chat" } : s
          );

          setSessions(updatedSessions);
          saveStorage({ sessions: updatedSessions, data: sessionDataRef.current });
        }
      }
    }
  });

  // Sync messages to sessionData and save
  useEffect(() => {
    if (!isClient || !currentSessionId) return;

    const newData = {
      ...sessionDataRef.current,
      [currentSessionId]: { messages, durations }
    };

    setSessionData(newData);
    saveStorage({ sessions: sessionsRef.current, data: newData });
  }, [messages, durations, currentSessionId, isClient]);


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
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={selectSession}
          onNewChat={createNewSession}
          onDeleteSession={deleteSession}
        />
      </div>

      <main className="flex-1 flex flex-col h-screen relative min-w-0">
        <div className="fixed top-0 left-0 right-0 md:left-64 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-4">
          <div className="relative overflow-visible px-4 pt-4 flex items-center gap-2">
            {/* Mobile Sidebar Trigger */}
            <div className="md:hidden">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <ChatSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onSelectSession={selectSession}
                    onNewChat={createNewSession}
                    onDeleteSession={deleteSession}
                  />
                </SheetContent>
              </Sheet>
            </div>

            <ChatHeader className="flex-1">
              <ChatHeaderBlock className="justify-center items-center w-full">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <p className="tracking-tight ml-2">Chat with {AI_NAME}</p>
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

        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-50 bg-linear-to-t from-background via-background/50 to-transparent dark:bg-black overflow-visible pt-13">
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
