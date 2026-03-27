"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CommonsEntry {
  id: string;
  summary: string;
  domain_tags: string[];
  geographic_tags: string[];
  seo_slug: string;
  date_published: number;
  page_views: number;
  tera_verified: boolean;
  highlight?: Record<string, { snippet?: string }>;
}

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState<CommonsEntry[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(
    async (searchPage = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (domain) params.set("domain", domain);
        params.set("page", searchPage.toString());

        const res = await fetch(`/api/knowledge/search?${params}`);
        const data = await res.json();

        setResults(data.entries || []);
        setTotalFound(data.totalFound || 0);
        setPage(searchPage);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query, domain]
  );

  return (
    <div>
      {/* Search bar */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1">
          <Input
            placeholder="Search the Knowledge Commons…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(1)}
            className="h-12 text-lg"
          />
        </div>
        <Input
          placeholder="Domain filter"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-48 h-12"
        />
        <Button
          onClick={() => search(1)}
          disabled={loading}
          className="h-12 px-6 bg-teal-600 hover:bg-teal-700"
        >
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {/* Results count */}
      {searched && (
        <p className="text-sm text-gray-500 mb-6">
          {totalFound} {totalFound === 1 ? "entry" : "entries"} found
        </p>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.map((entry) => {
          const firstDomain = entry.domain_tags?.[0] || "general";
          const url = `/knowledge/${encodeURIComponent(firstDomain)}/${entry.seo_slug}`;
          const date = new Date(entry.date_published * 1000).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", year: "numeric" }
          );

          return (
            <a key={entry.id} href={url} className="block">
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {entry.domain_tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {entry.geographic_tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Summary excerpt */}
                    <p className="text-gray-700 line-clamp-3">
                      {entry.summary?.slice(0, 300)}
                      {(entry.summary?.length || 0) > 300 ? "…" : ""}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{date}</span>
                      <span>{entry.page_views} views</span>
                      {entry.tera_verified && (
                        <span className="text-teal-600 font-medium">✓ Tera Verified</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </a>
          );
        })}
      </div>

      {/* Empty state */}
      {searched && results.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No entries found</p>
          <p className="text-gray-400">
            Try a different search term or browse without filters.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalFound > 20 && (
        <div className="flex justify-center gap-3 mt-8">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => search(page - 1)}
          >
            Previous
          </Button>
          <span className="self-center text-sm text-gray-500">
            Page {page} of {Math.ceil(totalFound / 20)}
          </span>
          <Button
            variant="outline"
            disabled={page * 20 >= totalFound}
            onClick={() => search(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
