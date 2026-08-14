"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LockPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const c = code;
    const r = await fetch("/api/lockdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c, locked: true }),
    }).catch(() => null);
    if (!r) return;
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      setCode("");
      if (j.ok === true) router.replace("/");
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="w-full rounded-md border border-bg-border bg-bg-panel px-3 py-2 text-center font-mono text-sm text-fg-primary placeholder:text-fg-dim focus:border-accent focus:outline-none"
          placeholder=""
          aria-label=""
        />
      </form>
    </div>
  );
}
