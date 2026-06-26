"use client";

import { useOptimistic, useTransition } from "react";
import { recordResultAction } from "@/app/actions/tournaments";

type Props = {
  publicCode: string;
  gameId: string;
  currentResult: string;
};

const RESULTS: [string, string][] = [
  ["white_win", "1-0"],
  ["draw", "½-½"],
  ["black_win", "0-1"],
];

export function GameResultButtons({ publicCode, gameId, currentResult }: Props) {
  const [optimisticResult, setOptimistic] = useOptimistic(currentResult);
  const [isPending, startTransition] = useTransition();

  function handleClick(result: string) {
    const fd = new FormData();
    fd.set("publicCode", publicCode);
    fd.set("gameId", gameId);
    fd.set("result", result);

    startTransition(async () => {
      setOptimistic(result);
      await recordResultAction(fd);
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:flex">
      {RESULTS.map(([result, label]) => {
        const isSelected = optimisticResult === result;
        return (
          <button
            key={result}
            type="button"
            aria-pressed={isSelected}
            disabled={isPending}
            onClick={() => handleClick(result)}
            className={`min-h-11 w-full rounded-md border px-4 text-base font-black transition-opacity sm:w-auto disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? "border-brand bg-brand text-white"
                : "border-border bg-white text-ink hover:border-brand"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
