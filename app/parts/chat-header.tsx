import { cn } from "@/lib/utils";

export function ChatHeaderBlock({ children, className }: { children?: React.ReactNode, className?: string }) {
    return (
        <div className={cn("flex flex-1 items-center gap-3", className)}>
            {children}
        </div>
    )
}

export function ChatHeader({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("flex w-full items-center gap-4", className)}>
            {children}
        </div>
    )
}