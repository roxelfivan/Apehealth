import { Suspense } from "react";
import { HistoryScreen } from "@/components/HistoryScreen";

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--background)]" />}>
      <HistoryScreen />
    </Suspense>
  );
}
