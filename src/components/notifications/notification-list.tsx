"use client";

import { NotificationItem } from "./notification-item";
import type { Notification } from "@/types/enums";

interface NotificationListProps {
  notifications: Notification[];
  onRead: (id: string) => void;
}

export function NotificationList({ notifications, onRead }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-10 w-10 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        <p className="mt-3 text-sm text-text-secondary">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          id={notif.id}
          type={notif.type}
          title={notif.title}
          body={notif.body}
          read={notif.read}
          sentAt={notif.sent_at}
          referenceId={notif.reference_id}
          referenceType={notif.reference_type}
          onRead={onRead}
        />
      ))}
    </div>
  );
}
