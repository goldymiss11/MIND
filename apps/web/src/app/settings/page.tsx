"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Globe, HelpCircle, MessageCircle } from "lucide-react";
import { useApi, useResource } from "../../lib/useApi";
import { previewMe } from "../../lib/preview";
import { CardGroup } from "../../components/ui/CardGroup";
import { RowItem } from "../../components/ui/RowItem";
import { IconCircle } from "../../components/ui/IconCircle";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { ListSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState, OutsideTelegram } from "../../components/ui/States";
import { Onboarding } from "../../components/Onboarding";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-good" : "bg-ink/20"}`}
    >
      <span
        className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-[left] duration-200 ${on ? "left-[22px]" : "left-[2px]"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, request, haptic, close, showAlert } = useApi();
  const { data, setData, error, loading, reload, isOutsideTelegram } = useResource("/me", previewMe);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;
    const goBack = () => router.push("/");
    backButton.show();
    backButton.onClick(goBack);
    return () => {
      backButton.offClick(goBack);
      backButton.hide();
    };
  }, [router]);

  if (isOutsideTelegram) return <OutsideTelegram />;
  if (loading && !data) return <ListSkeleton />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;

  const me = data;

  const toggleDigest = async (digestEnabled: boolean) => {
    haptic.selection();
    setData({ ...me, digestEnabled });
    try {
      await request("/me", "PATCH", { digestEnabled });
    } catch (err: any) {
      setData(me);
      await showAlert(err.message || "Не удалось сохранить");
    }
  };

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  return (
    <main className="screen !pb-8">
      <header className="flex flex-col items-center pb-3 pt-4 text-center">
        {user?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photo_url} alt="" className="h-[88px] w-[88px] rounded-full object-cover" />
        ) : (
          <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-card text-[36px] font-bold">
            {user?.first_name?.charAt(0).toUpperCase() ?? "?"}
          </span>
        )}
        <h1 className="mt-3 text-[24px] font-bold leading-7">{name}</h1>
        {user?.username && <p className="mt-0.5 text-[15px] text-hint">@{user.username}</p>}
      </header>

      <SectionHeader title="Напоминания" />
      <CardGroup>
        <RowItem
          icon={<IconCircle icon={CalendarDays} color="bg-warn" />}
          title="Утренняя сводка"
          subtitle="План на день по утрам"
          right={<Toggle label="Утренняя сводка" on={me.digestEnabled} onChange={toggleDigest} />}
        />
        <RowItem
          icon={<IconCircle icon={Globe} color="bg-accent" />}
          title="Часовой пояс"
          subtitle={me.timezone.replace(/_/g, " ")}
        />
      </CardGroup>
      <p className="px-1.5 text-[13px] leading-[18px] text-hint">
        Определяется по устройству. Чтобы задать вручную, напишите боту свой город.
      </p>

      <SectionHeader title="О приложении" />
      <CardGroup>
        <RowItem
          onClick={() => setIsAboutOpen(true)}
          icon={<IconCircle icon={HelpCircle} color="bg-purple" />}
          title="Что умеет MIND"
          showChevron
        />
        <RowItem
          onClick={() => {
            haptic.impact("light");
            close();
          }}
          icon={<IconCircle icon={MessageCircle} color="bg-good" />}
          title="Вернуться в чат"
          showChevron
        />
      </CardGroup>

      <Onboarding isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}
