import { useState } from "react";

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded-md border border-taupe/40 bg-white px-2.5 py-1 text-xs font-medium text-taupe-deep transition hover:bg-taupe hover:text-white"
    >
      {done ? "복사됨 ✓" : label}
    </button>
  );
}
