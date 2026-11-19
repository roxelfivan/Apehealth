import Image from "next/image";

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/apehealth-logo-transparent.png"
      alt="Ape Health"
      width={421}
      height={446}
      priority
      className={className ?? "h-12 w-auto shrink-0 select-none"}
    />
  );
}
