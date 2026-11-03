import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Briefcase,
  Code2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Heart,
  Presentation,
  Rocket,
  User,
} from "lucide-react";

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Solid colour for icon circles and tiles. */
  solid: string;
}

const MEMORY_CATEGORIES: Record<string, Category> = {
  educational: { id: "educational", label: "Учёба", icon: GraduationCap, solid: "bg-good" },
  preference: { id: "preference", label: "Предпочтения", icon: Heart, solid: "bg-bad" },
  project: { id: "project", label: "Проекты", icon: Rocket, solid: "bg-accent" },
  professional: { id: "professional", label: "Работа", icon: Briefcase, solid: "bg-warn" },
  relationship: { id: "relationship", label: "Люди", icon: User, solid: "bg-purple" },
};
const OTHER_MEMORY: Category = { id: "other", label: "Факты", icon: Brain, solid: "bg-purple" };

export function memoryCategory(type?: string | null): Category {
  return MEMORY_CATEGORIES[(type ?? "").toLowerCase()] ?? OTHER_MEMORY;
}

export const MEMORY_TYPE_OPTIONS = [
  { value: "semantic", label: "Факт обо мне" },
  { value: "preference", label: "Предпочтение" },
  { value: "educational", label: "Учёба" },
  { value: "professional", label: "Работа" },
  { value: "project", label: "Проект" },
];

const DOCUMENT: Category = { id: "documents", label: "Документы", icon: FileText, solid: "bg-accent" };
const SLIDES: Category = { id: "slides", label: "Презентации", icon: Presentation, solid: "bg-warn" };
const SHEETS: Category = { id: "sheets", label: "Таблицы", icon: FileSpreadsheet, solid: "bg-good" };
const CODE: Category = { id: "code", label: "Код", icon: Code2, solid: "bg-purple" };

export const FILE_CATEGORIES = [DOCUMENT, SLIDES, SHEETS, CODE];

export function fileCategory(type?: string | null): Category {
  const t = (type ?? "").toLowerCase();
  if (["docx", "doc", "pdf", "md", "markdown", "txt"].includes(t)) return DOCUMENT;
  if (t === "pptx" || t === "ppt") return SLIDES;
  if (t === "xlsx" || t === "csv") return SHEETS;
  return CODE;
}
