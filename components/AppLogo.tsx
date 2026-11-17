import Image from "next/image";

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/apeditor-logo-transparent.png"
      alt="Apehealth"
      width={449}
      height={500}
      priority
      className={className ?? "h-12 w-auto shrink-0 select-none"}
    />
  );
}
