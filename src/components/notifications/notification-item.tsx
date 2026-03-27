"use client";

import Link from "next/link";

interface NotificationItemProps {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  sentAt: string;
  referenceId: string | null;
  referenceType: string | null;
  onRead: (id: string) => void;
}

function getNotificationLink(type: string, referenceId: string | null, referenceType: string | null): string {
  if (!referenceId) return "#";

  switch (referenceType) {
    case "conversations":
      return `/conversations/${referenceId}`;
    case "requests":
      return `/requests/${referenceId}`;
    case "match_attempts":
      return "/helper/invitations";
    default:
      return "#";
  }
}

function getNotificationIcon(type: string): React.ReactNode {
  switch (type) {
    case "match_confirmed":
    case "match_notification":
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tera-100">
          <svg className="h-4 w-4 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
      );
    case "conversation_completed":
    case "summary_ready":
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    case "new_message":
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
      );
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationItem({
  id,
  type,
  title,
  body,
  read,
  sentAt,
  referenceId,
  referenceType,
  onRead,
}: NotificationItemProps) {
  const link = getNotificationLink(type, referenceId, referenceType);

  function handleClick() {
    if (!read) onRead(id);
  }

  return (
    <Link
      href={link}
      onClick={handleClick}
      className={`flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-secondary ${
        !read ? "bg-tera-50/50" : ""
      }`}
    >
      {getNotificationIcon(type)}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${!read ? "font-semibold text-text-primary" : "text-text-primary"}`}>
            {title}
          </p>
          {!read && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tera-500" />
          )}
        </div>
        <p className="text-xs text-text-secondary line-clamp-2">{body}</p>
        <p className="mt-1 text-[10px] text-text-muted">{timeAgo(sentAt)}</p>
      </div>
    </Link>
  );
}
