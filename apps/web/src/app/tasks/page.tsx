"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../lib/telegram/useTelegram";
import { fetchWithAuth } from "../../lib/api/client";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export default function TasksPage() {
  const { initData, isReady } = useTelegram();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && initData) {
      loadTasks();
    } else if (isReady && !initData) {
      setError("Please open this app inside Telegram");
      setLoading(false);
    }
  }, [isReady, initData]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth("/api/miniapp/tasks", initData);
      setTasks(Array.isArray(result) ? result : (result?.data ?? []));
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "completed" ? "in_progress" : "completed";
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      await fetchWithAuth(`/api/miniapp/tasks/${taskId}`, initData, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      loadTasks();
    }
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#2481cc] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadTasks} className="px-4 py-2 bg-[#2481cc] text-white rounded-xl">Retry</button>
      </div>
    );
  }

  return (
    <main className="p-4 flex flex-col gap-4 min-h-screen pb-24">
      <header className="mt-2 mb-4">
        <h1 className="text-2xl font-bold">Tasks</h1>
      </header>

      <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
         {["All", "Today", "Upcoming", "Completed"].map((filter, i) => (
            <button key={i} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${i === 0 ? 'bg-[#2481cc] text-white' : 'bg-[#1c1c1d] text-[#999999]'}`}>
               {filter}
            </button>
         ))}
      </div>

      <div className="flex flex-col gap-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="bg-[#1c1c1d] p-4 rounded-2xl flex items-start gap-3">
              <button onClick={() => toggleTask(task.id, task.status)} className="mt-0.5 shrink-0">
                {task.status === 'completed' ? (
                  <CheckCircle2 size={24} className="text-[#2481cc]" />
                ) : (
                  <Circle size={24} className="text-[#999999]" />
                )}
              </button>
              <div className="flex-1">
                <h3 className={`text-[15px] font-medium leading-tight mb-1 ${task.status === 'completed' ? 'text-[#999999] line-through' : 'text-white'}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-[#999999] text-xs line-clamp-2 mb-2">{task.description}</p>
                )}
                {task.deadline && (
                  <div className="flex items-center gap-1 text-[#2481cc] text-xs font-medium">
                    <Clock size={12} />
                    <span>{new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-[#999999] mt-10">
            No tasks found
          </div>
        )}
      </div>
    </main>
  );
}
