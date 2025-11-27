import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type ChatSession = {
    id: string;
    title: string;
    createdAt: number;
};

interface ChatSidebarProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
}

export function ChatSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
}: ChatSidebarProps) {
    return (
        <div className="flex flex-col h-full w-64 border-r bg-muted/20">
            <div className="p-4">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2"
                    variant="outline"
                >
                    <Plus className="size-4" />
                    New Chat
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2">
                <div className="space-y-1">
                    {sessions
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((session) => (
                            <div
                                key={session.id}
                                className={cn(
                                    "group flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    currentSessionId === session.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                                onClick={() => onSelectSession(session.id)}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <MessageSquare className="size-4 shrink-0" />
                                    <span className="truncate">{session.title}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(session.id);
                                    }}
                                >
                                    <Trash2 className="size-3" />
                                </Button>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
