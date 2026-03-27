"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUser();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="text-lg font-bold text-tera-700">
          Tera
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell />

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-text-secondary sm:block">
              {profile?.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
