"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert } from "@/components/ui/alert";

interface ApiKeyRow {
  id: string;
  institutional_account_id: string;
  scopes: string[];
  rate_limit_per_minute: number;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function AdminApiKeysPage() {
  const supabase = createClient();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAccountId, setNewAccountId] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("api_keys")
        .select("id, institutional_account_id, scopes, rate_limit_per_minute, created_at, last_used_at, revoked_at")
        .order("created_at", { ascending: false });

      setKeys((data || []) as unknown as ApiKeyRow[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleGenerate() {
    if (!newAccountId.trim()) return;

    // Generate a random API key
    const keyValue = `tera_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

    // Hash it for storage (simple hash for MVP — use bcrypt in production)
    const encoder = new TextEncoder();
    const data = encoder.encode(keyValue);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error } = await supabase.from("api_keys").insert({
      institutional_account_id: newAccountId.trim(),
      key_hash: keyHash,
      scopes: ["read_knowledge_commons", "submit_requests"],
      rate_limit_per_minute: 100,
    } as Record<string, unknown>);

    if (!error) {
      setNewKey(keyValue);
      setNewAccountId("");
      // Refresh list
      const { data: refreshed } = await supabase
        .from("api_keys")
        .select("id, institutional_account_id, scopes, rate_limit_per_minute, created_at, last_used_at, revoked_at")
        .order("created_at", { ascending: false });
      setKeys((refreshed || []) as unknown as ApiKeyRow[]);
    }
  }

  async function handleRevoke(keyId: string) {
    await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", keyId);

    setKeys((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
      )
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">API Keys</h1>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Generate New Key</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Institutional account name"
            value={newAccountId}
            onChange={(e) => setNewAccountId(e.target.value)}
          />
          <Button onClick={handleGenerate} disabled={!newAccountId.trim()}>
            Generate
          </Button>
        </div>
        {newKey && (
          <Alert variant="success" title="Key generated" className="mt-4">
            <p className="font-mono text-xs break-all">{newKey}</p>
            <p className="mt-2 text-xs">Copy this key now — it will not be shown again.</p>
          </Alert>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Existing Keys</h2>
        {keys.length === 0 ? (
          <p className="text-text-secondary">No API keys yet.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <p className="font-medium text-text-primary">{k.institutional_account_id}</p>
                  <div className="flex gap-2 mt-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Created: {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` • Last used: ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                {k.revoked_at ? (
                  <Badge variant="danger">Revoked</Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleRevoke(k.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
