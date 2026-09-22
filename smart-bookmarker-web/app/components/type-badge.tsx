import type { CaptureType } from "../lib/types";

const TYPE_CONFIG: Record<
  CaptureType,
  { label: string; color: string }
> = {
  article: { label: "Article", color: "bg-blue-950 text-blue-400 border-blue-900" },
  video: { label: "Video", color: "bg-red-950 text-red-400 border-red-900" },
  pdf: { label: "PDF", color: "bg-orange-950 text-orange-400 border-orange-900" },
  image: { label: "Image", color: "bg-purple-950 text-purple-400 border-purple-900" },
  github: { label: "GitHub", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
};

export function TypeBadge({ type }: { type: CaptureType | null }) {
  if (!type) return null;

  const config = TYPE_CONFIG[type];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
