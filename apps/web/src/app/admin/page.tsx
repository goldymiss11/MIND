import React from "react";
import { ShieldAlert, Lock } from "lucide-react";
import { getMetrics, getAudienceStats, getRecentActivity, getAiMetrics } from "./actions";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams?: {
    secret?: string;
  };
}

export default async function AdminPage({ searchParams }: PageProps) {
  const adminSecret = process.env.ADMIN_SECRET || "founder_super_secret_2026";
  const userSecret = searchParams?.secret;

  // Basic security check: require ?secret=ADMIN_SECRET
  if (!userSecret || userSecret !== adminSecret) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex items-center justify-center p-4 selection:bg-red-500 selection:text-white">
        <div className="max-w-md w-full rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 p-8 text-center space-y-5 shadow-2xl shadow-black/80">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              401 • Unauthorized
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Панель администратора MIND защищена. Для входа укажите секретный ключ в параметре запроса:
            </p>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-400 break-all select-all">
              /admin?secret=YOUR_ADMIN_SECRET
            </div>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Unauthorized access attempts are logged</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "mindopus_bot";

  // Real data fetching via @mind/db server actions
  const [metrics, audienceStats, activities, aiData] = await Promise.all([
    getMetrics(),
    getAudienceStats(),
    getRecentActivity(),
    getAiMetrics(),
  ]);

  return (
    <DashboardClient
      initialMetrics={metrics}
      initialAudience={audienceStats}
      initialActivity={activities}
      initialAiData={aiData}
      botUsername={botUsername}
    />
  );
}
