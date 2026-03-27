"use client";

interface Message {
  id: string;
  text: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function shouldShowDateSeparator(current: Message, previous: Message | undefined): boolean {
  if (!previous) return true;
  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();
  return currentDate !== previousDate;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  return (
    <div className="space-y-1">
      {messages.map((msg, idx) => {
        const isOwn = msg.user_id === currentUserId;
        const showDate = shouldShowDateSeparator(msg, messages[idx - 1]);
        const showAvatar =
          idx === 0 ||
          messages[idx - 1]?.user_id !== msg.user_id ||
          showDate;

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex justify-center py-3">
                <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs text-text-muted">
                  {formatDateSeparator(msg.created_at)}
                </span>
              </div>
            )}

            <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
              <div className={`flex max-w-[80%] gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                {!isOwn && showAvatar && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tera-100 text-xs font-semibold text-tera-700 mt-0.5">
                    {msg.user_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-7 shrink-0" />}

                <div>
                  {showAvatar && !isOwn && (
                    <p className="mb-0.5 text-xs font-medium text-text-muted px-1">
                      {msg.user_name}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm ${
                      isOwn
                        ? "bg-tera-600 text-white"
                        : "bg-surface-secondary text-text-primary"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  <p
                    className={`mt-0.5 text-[10px] text-text-muted px-1 ${
                      isOwn ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
