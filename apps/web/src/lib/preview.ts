// Sample data for viewing the screens in a browser during development. Never used in production.
const day = 86400000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

export const previewTasks = [
  { id: "1", title: "Сдать курсовую по дискретной математике", description: "Оформить список литературы по ГОСТу", deadline: iso(day * 2), priority: "high", status: "in_progress", recurrence: null },
  { id: "2", title: "Позвонить научруку", description: null, deadline: iso(3 * 3600000), priority: "normal", status: "in_progress", recurrence: null },
  { id: "3", title: "Пить витамины", description: null, deadline: iso(day), priority: "normal", status: "in_progress", recurrence: "daily" },
  { id: "4", title: "Оплатить общежитие", description: null, deadline: iso(-day), priority: "normal", status: "in_progress", recurrence: null },
  { id: "5", title: "Прочитать главу про графы", description: null, deadline: null, priority: "normal", status: "inbox", recurrence: null },
  { id: "6", title: "Купить билеты домой", description: "Прямые рейсы", deadline: null, priority: "normal", status: "completed", recurrence: null },
];

export const previewMemories = [
  { id: "1", type: "educational", content: "Учится на 3 курсе, специальность прикладная математика.", createdAt: iso(0) },
  { id: "2", type: "educational", content: "Курс дискретной математики: графы, автоматы, машина Тьюринга.", createdAt: iso(-day) },
  { id: "3", type: "preference", content: "Любит краткие ответы без вступительных фраз.", createdAt: iso(-day * 2) },
  { id: "4", type: "preference", content: "Документы оформлять строго по ГОСТу.", createdAt: iso(-day * 3) },
  { id: "5", type: "project", content: "Пишет дипломную работу про алгоритмы на графах.", createdAt: iso(-day * 4) },
  { id: "6", type: "professional", content: "Подрабатывает фронтенд-разработчиком.", createdAt: iso(-day * 5) },
  { id: "7", type: "semantic", content: "Живёт в Казани.", createdAt: iso(-day * 6) },
  { id: "8", type: "educational", content: "Сессия начинается в январе.", createdAt: iso(-day * 7) },
];

export const previewArtifacts = [
  { id: "1", name: "Реферат_по_графам_1793661488969.docx", type: "docx", createdAt: iso(0), content: "# Реферат по графам\n\n## Введение\n\nАктуальность темы обусловлена широким применением графов в прикладных задачах." },
  { id: "2", name: "Защита_диплома_1793661488970.pptx", type: "pptx", createdAt: iso(-day), content: JSON.stringify({ title: "Защита диплома", slides: [{ title: "Цель работы", bullets: [] }, { title: "Алгоритмы", bullets: [] }, { title: "Выводы", bullets: [] }] }) },
  { id: "3", name: "Бюджет_на_семестр_1793661488971.xlsx", type: "xlsx", createdAt: iso(-day * 2), content: JSON.stringify({ columns: ["Статья", "Сумма"], rows: [["Еда", 12000], ["Общежитие", 3000]] }) },
  { id: "4", name: "dijkstra.py", type: "py", createdAt: iso(-day * 3), content: "def dijkstra(graph, start):\n    ..." },
  { id: "5", name: "Методичка.pdf", type: "pdf", createdAt: iso(-day * 4), content: "Методические указания к курсовой работе." },
];

export const previewHome = {
  tasksCount: 5,
  completedThisWeek: 4,
  memoriesCount: previewMemories.length,
  artifactsCount: previewArtifacts.length,
  upcomingTasks: previewTasks.filter((t) => t.deadline && new Date(t.deadline).getTime() > Date.now()).slice(0, 3),
  recentMemories: previewMemories.slice(0, 3),
  recentArtifacts: previewArtifacts.slice(0, 3),
};

export const previewMe = { timezone: "Europe/Moscow", digestEnabled: true };
