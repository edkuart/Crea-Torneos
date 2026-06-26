"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  intervalMs?: number;
};

export function AutoRefresh({ intervalMs = 20_000 }: Props) {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    let lastRefresh = Date.now();

    const ticker = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastRefresh) / 1000));
    }, 1000);

    const refresher = setInterval(() => {
      router.refresh();
      lastRefresh = Date.now();
      setSecondsAgo(0);
    }, intervalMs);

    return () => {
      clearInterval(ticker);
      clearInterval(refresher);
    };
  }, [router, intervalMs]);

  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-400">
      <span className="size-1.5 rounded-full bg-green-400" aria-hidden="true" />
      {secondsAgo === null
        ? `En vivo · actualiza cada ${intervalMs / 1000}s`
        : `Actualizado hace ${secondsAgo}s`}
    </span>
  );
}
