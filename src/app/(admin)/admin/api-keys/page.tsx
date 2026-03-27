"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ApiKeyRecord {
  id: string;
  institutional_account_id: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  rate_limit_per_minute: number;
}

const AVAILABLE_SCOPES = [
  "read_knowledge_commons",
  "submit_requests",
  "manage_helpers",
  "access_analytics",
];

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    accountId: "",
    scopes: [] as string[],
    rateLimit: 100,
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys || []);
    }
    setLoading(false);
  }

  async function createKey() {
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionalAccountId: newKeyData.accountId,
        scopes: newKeyData.scopes,
        rateLimitPerMinute: newKeyData.rateLimit,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setCreatedKey(data.plainTextKey);
      loadKeys();
      setShowCreate(false);
      setNewKeyData({ accountId: "", scopes: [], rateLimit: 100 });
    }
  }

  async function revokeKey(keyId: string) {
    await fetch(`/api/admin/api-keys/${keyId}/revoke`, { method: "POST" });
    loadKeys();
  }

  function toggleScope(scope: string) {
    setNewKeyData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">API Key Management</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Generate New Key"}
        </Button>
      </div>

      {/* Created key display (one-time) */}
      {createdKey && (
        <Card className="p-5 mb-6 bg-green-50 border-green-200">
          <p className="font-medium text-green-800 mb-2">
            API Key created successfully. Copy it now — it will not be shown again.
          </p>
          <code className="block p-3 bg-white rounded border text-sm font-mono break-all">
            {createdKey}
          </code>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(createdKey);
              setCreatedKey(null);
            }}
          >
            Copy & Dismiss
          </Button>
        </Card>
      )}

      {/* Create form */}
      {showCreate && (
        <Card className="p-6 mb-6">
          <h2 className="font-semibold mb-4">Generate API Key</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Institutional Account ID</label>
              <Input
                value={newKeyData.accountId}
                onChange={(e) =>
                  setNewKeyData((prev) => ({ ...prev, accountId: e.target.value }))
                }
                placeholder="e.g. university-of-oxford"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      newKeyData.scopes.includes(scope)
                        ? "bg-teal-50 border-teal-500 text-teal-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rate Limit (requests/min)</label>
              <Input
                type="number"
                value={newKeyData.rateLimit}
                onChange={(e) =>
                  setNewKeyData((prev) => ({ ...prev, rateLimit: parseInt(e.target.value) || 100 }))
                }
              />
            </div>
            <Button
              onClick={createKey}
              disabled={!newKeyData.accountId || newKeyData.scopes.length === 0}
            >
              Generate Key
            </Button>
          </div>
        </Card>
      )}

      {/* Keys table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Account</th>
                <th className="text-left p-3 font-medium">Scopes</th>
                <th className="text-left p-3 font-medium">Rate Limit</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Last Used</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No API keys</td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{key.institutional_account_id}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{key.rate_limit_per_minute}/min</td>
                    <td className="p-3 text-gray-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-gray-500">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="p-3">
                      <Badge variant={key.revoked_at ? "destructive" : "secondary"}>
                        {key.revoked_at ? "Revoked" : "Active"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {!key.revoked_at && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeKey(key.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
