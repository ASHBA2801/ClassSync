"use client";

import { useState } from "react";
import { searchGlobalUsersAction } from "@/actions/monitoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type UserResult = Awaited<ReturnType<typeof searchGlobalUsersAction>>[number];

export function GlobalUserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const users = await searchGlobalUsersAction(query);
      setResults(users);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or name" />
        <Button type="submit" disabled={loading}>{loading ? "Searching..." : "Search"}</Button>
      </form>
      <div className="space-y-2">
        {results.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4">
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-zinc-500">{u.email}</p>
              <div className="mt-2 text-xs text-zinc-400">
                {u.memberships.map((m) => (
                  <span key={m.id} className="mr-2">{m.role} @ {m.school.name}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
