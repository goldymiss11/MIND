"use client";

import React, { useState } from "react";
import { ModalSheet } from "../ui/ModalSheet";
import { useApi } from "../../lib/useApi";

export function NewTaskSheet({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (task: any) => void;
}) {
  const { request, haptic, showAlert } = useApi();
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const body = {
      title: title.trim(),
      // datetime-local has no zone, so the Date constructor reads it in the device's zone.
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      recurrence: deadline && recurrence ? recurrence : undefined,
    };

    try {
      setSaving(true);
      const created = await request("/tasks", "POST", body, {
        id: String(Date.now()),
        status: "in_progress",
        priority: "normal",
        ...body,
      });
      haptic.notification("success");
      onCreated(created);
      setTitle("");
      setDeadline("");
      setRecurrence("");
      onClose();
    } catch (err: any) {
      haptic.notification("error");
      await showAlert(err.message || "Не удалось создать задачу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} title="Новая задача">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          required
          autoFocus
          aria-label="Название"
          placeholder="Что нужно сделать?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
        />
        <label className="block">
          <span className="mb-1.5 block px-1 text-[15px] text-hint">Напомнить</span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="field"
          />
        </label>
        {deadline && (
          <label className="block">
            <span className="mb-1.5 block px-1 text-[15px] text-hint">Повторять</span>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="field">
              <option value="">Не повторять</option>
              <option value="daily">Каждый день</option>
              <option value="weekly">Каждую неделю</option>
              <option value="monthly">Каждый месяц</option>
            </select>
          </label>
        )}
        <button type="submit" disabled={saving || !title.trim()} className="btn-primary mt-2">
          {saving ? "Сохраняю…" : "Создать"}
        </button>
      </form>
    </ModalSheet>
  );
}
