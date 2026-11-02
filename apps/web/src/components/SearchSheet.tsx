"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ModalSheet } from "./ui/ModalSheet";
import { CardGroup } from "./ui/CardGroup";
import { RowItem } from "./ui/RowItem";
import { IconCircle } from "./ui/IconCircle";
import { CheckCircle2 } from "lucide-react";
import { useApi } from "../lib/useApi";
import { fileCategory, memoryCategory } from "../lib/categories";
import { displayFileName } from "../lib/format";
import { previewArtifacts, previewMemories, previewTasks } from "../lib/preview";

interface Results {
  tasks: any[];
  memories: any[];
  artifacts: any[];
}

const SEARCH_DELAY_MS = 250;

function previewSearch(q: string): Results {
  const has = (value?: string | null) => value?.toLowerCase().includes(q.toLowerCase());
  return {
    tasks: previewTasks.filter((t) => has(t.title)),
    memories: previewMemories.filter((m) => has(m.content)),
    artifacts: previewArtifacts.filter((a) => has(a.name)),
  };
}

export function SearchSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { request } = useApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      request<Results>(`/search?q=${encodeURIComponent(q)}`, "GET", undefined, previewSearch(q))
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch(() => {
          if (!cancelled) setResults({ tasks: [], memories: [], artifacts: [] });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, request]);

  const close = () => {
    setQuery("");
    onClose();
  };
  const isEmpty = results && !results.tasks.length && !results.memories.length && !results.artifacts.length;

  return (
    <ModalSheet isOpen={isOpen} onClose={close} title="Поиск">
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-hint" />
        <input
          autoFocus
          aria-label="Поиск"
          placeholder="Задачи, память, файлы"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field pl-11"
        />
      </div>

      <div className="mt-3 flex min-h-[200px] flex-col gap-3">
        {isEmpty && <p className="py-8 text-center text-[15px] text-hint">Ничего не нашлось</p>}
        {results && results.tasks.length + results.memories.length + results.artifacts.length > 0 && (
          <CardGroup className="!bg-ink/[0.05]">
            {results.tasks.map((t) => (
              <Link key={t.id} href="/tasks" onClick={close} className="block">
                <RowItem className="!bg-transparent" icon={<IconCircle icon={CheckCircle2} color="bg-accent" />} title={t.title} subtitle="Задача" />
              </Link>
            ))}
            {results.memories.map((m) => {
              const category = memoryCategory(m.type);
              return (
                <Link key={m.id} href="/memory" onClick={close} className="block">
                  <RowItem className="!bg-transparent" icon={<IconCircle icon={category.icon} color={category.solid} />} title={m.content} subtitle={category.label} />
                </Link>
              );
            })}
            {results.artifacts.map((a) => {
              const category = fileCategory(a.type);
              return (
                <Link key={a.id} href="/artifacts" onClick={close} className="block">
                  <RowItem className="!bg-transparent" icon={<IconCircle icon={category.icon} color={category.solid} />} title={displayFileName(a.name)} subtitle="Файл" />
                </Link>
              );
            })}
          </CardGroup>
        )}
      </div>
    </ModalSheet>
  );
}
