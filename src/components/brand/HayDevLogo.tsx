import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_SOURCE = "/branding/haydevos-logo-custom.webp";

export function HayDevLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_SOURCE}
      alt="HayDevOS"
      width={1536}
      height={1024}
      priority={priority}
      className={cn("h-auto w-full object-contain", className)}
    />
  );
}

export function HayDevMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-cyan/25 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(34,211,238,0.16)]",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src={LOGO_SOURCE}
        alt=""
        width={1536}
        height={1024}
        className="absolute -left-[23px] -top-px h-auto w-[80px] max-w-none"
      />
    </span>
  );
}
