import { useState, useRef, useEffect } from "react"
import {
  Bell,
  CheckCheck,
  Trash2,
  FileCheck,
  AlertCircle,
  Info,
  Sparkles,
} from "lucide-react"

export type Notification = {
  id: string
  type: "synthesis_complete" | "document_processed" | "error" | "info"
  title: string
  description: string
  timestamp: Date
  read: boolean
}

type NotificationCenterProps = {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClear: () => void
  onSelectNotification?: (notification: Notification) => void
}

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffSeconds < 60) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return `${diffWeeks}w ago`
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "synthesis_complete":
      return <Sparkles className="h-4 w-4 text-primary" />
    case "document_processed":
      return <FileCheck className="h-4 w-4 text-green-500" />
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />
  }
}

export default function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClear,
  onSelectNotification,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative px-4 py-2 text-sm rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2.5 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={onMarkAllRead}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Mark all read"
                title="Mark all read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                onClick={onClear}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Clear all"
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => {
                  const handleSelect = () => {
                    if (!notification.read) {
                      onMarkRead(notification.id)
                    }
                    if (onSelectNotification) {
                      onSelectNotification(notification)
                    }
                  }
                  return (
                  <li
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${notification.read ? '' : 'Unread. '}${notification.title}`}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
                      !notification.read ? "bg-muted/30" : ""
                    }`}
                    onClick={handleSelect}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleSelect()
                      }
                    }}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            !notification.read
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span
                          className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0"
                          title={notification.timestamp.toLocaleString()}
                        >
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.description}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="mt-2 flex-shrink-0">
                        <span className="h-2 w-2 rounded-full bg-primary block" />
                      </div>
                    )}
                  </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
