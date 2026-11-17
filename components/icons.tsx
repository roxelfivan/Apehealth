import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function Icon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function HouseIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </Icon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10.2 3.6h3.6l.5 2.1 1.8.8 2-1.1 2.5 2.5-1.1 2 .8 1.8 2.1.5v3.6l-2.1.5-.8 1.8 1.1 2-2.5 2.5-2-1.1-1.8.8-.5 2.1h-3.6l-.5-2.1-1.8-.8-2 1.1-2.5-2.5 1.1-2-.8-1.8-2.1-.5V10.2l2.1-.5.8-1.8-1.1-2 2.5-2.5 2 1.1 1.8-.8z" />
      <circle cx="12" cy="12" r="2.6" />
    </Icon>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </Icon>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.2" />
      <path d="m8 16 3.2-3.2 2.4 2.4L17.5 12 20 14.8" />
    </Icon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
    </Icon>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 12S7 6.5 12 6.5 20.5 12 20.5 12 17 17.5 12 17.5 3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.3" />
    </Icon>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m4 5 16 14" />
      <path d="M9.9 7.4A7 7 0 0 1 12 6.5c5 0 8.5 5.5 8.5 5.5a14 14 0 0 1-2.4 2.9M6.2 9.3A14 14 0 0 0 3.5 12S7 17.5 12 17.5c1.2 0 2.3-.3 3.3-.7" />
    </Icon>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Icon>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m7 10 5 5 5-5" />
    </Icon>
  );
}
