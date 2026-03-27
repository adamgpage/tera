"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface UserRow {
  id: string;
  email: string;
  name: string;
  country: string;
  is_helper: boolean;
  is_admin: boolean;
  account_status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("users")
        .select("id, email, name, country, is_helper, is_admin, account_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      setUsers((data || []) as unknown as UserRow[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = search
    ? users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  async function toggleStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await supabase
      .from("users")
      .update({ account_status: newStatus } as Record<string, unknown>)
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, account_status: newStatus } : u))
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">User Management</h1>

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-text-muted">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Country</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-text-primary">{u.name || "—"}</td>
                <td className="py-3 pr-4 text-text-secondary">{u.email}</td>
                <td className="py-3 pr-4">{u.country || "—"}</td>
                <td className="py-3 pr-4">
                  <div className="flex gap-1">
                    {u.is_helper && <Badge variant="secondary">Helper</Badge>}
                    {u.is_admin && <Badge variant="success">Admin</Badge>}
                    {!u.is_helper && !u.is_admin && <Badge>User</Badge>}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={u.account_status === "active" ? "success" : "danger"}>
                    {u.account_status}
                  </Badge>
                </td>
                <td className="py-3">
                  <Button
                    size="sm"
                    variant={u.account_status === "active" ? "secondary" : "default"}
                    onClick={() => toggleStatus(u.id, u.account_status)}
                  >
                    {u.account_status === "active" ? "Suspend" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
