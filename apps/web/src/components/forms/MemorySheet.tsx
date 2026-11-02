"use client";

import React, { useState } from "react";
import { ModalSheet } from "../ui/ModalSheet";
import { useApi } from "../../lib/useApi";
import { MEMORY_TYPE_OPTIONS } from "../../lib/categories";

export function NewMemorySheet({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (memory: any) => void;
}) {
  const { request, haptic, showAlert } = useApi();
  const [content, setContent] = useState("");
  const [type, setType] = useState("semantic");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const body = { content: content.trim(), type };
    try {
      setSaving(true);
      const created = await request("/memories", "POST", body, {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        ...body,
      });
      haptic.notification("success");
      onCreated(created);
      setContent("");
      onClose();
    } catch (err: any) {
      haptic.notification("error");
      await showAlert(err.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} title="Запомнить" subtitle="MIND будет учитывать это в ответах">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea
          required
          autoFocus
          rows={3}
          aria-label="Что запомнить"
          placeholder="Например: учусь на 3 курсе, люблю короткие ответы"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="field resize-none"
        />
        <select aria-label="Тип" value={type} onChange={(e) => setType(e.target.value)} className="field">
          {MEMORY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={saving || !content.trim()} className="btn-primary mt-2">
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>
      </form>
    </ModalSheet>
  );
}
