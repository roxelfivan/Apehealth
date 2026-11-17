import { Suspense } from "react";
import { AddMeal } from "@/components/AddMeal";

export default function AddMealPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--background)]" />}>
      <AddMeal />
    </Suspense>
  );
}
