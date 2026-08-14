"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

function BlankUnlock({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const { getIdToken } = useAuth();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const token = await getIdToken();
    const r = await fetch("/api/lockdown", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ code, locked: false }),
    }).catch(() => null);
    if (!r) return;
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j.ok === true) onDone();
    }
    setCode("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="w-full rounded-md border border-bg-border bg-bg-panel px-3 py-2 text-center font-mono text-sm text-fg-primary placeholder:text-fg-dim focus:border-accent focus:outline-none"
        />
      </form>
    </div>
  );
}

function BlankBlock() {
  return <div className="flex min-h-screen items-center justify-center bg-bg-base text-fg-dim" />;
}

export function LockdownGate({ children }: { children: ReactNode }) {
  const { admin, getIdToken } = useAuth();
  const [locked, setLocked] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function check() {
      try {
        const token = await getIdToken();
        const r = await fetch("/api/lockdown", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancel) {
          setLocked(j.locked === true);
          if (typeof j.owner === "boolean") setIsOwner(j.owner);
        }
      } catch (_) {}
    }
    check();
    const t = setInterval(check, 3000);
    return () => { cancel = true; clearInterval(t); };
  }, [getIdToken]);

  if (locked === null) {
    return <div className="flex min-h-screen items-center justify-center bg-bg-base text-fg-muted" />;
  }

  if (locked) {
    return isOwner ? <BlankUnlock onDone={() => setLocked(false)} /> : <BlankBlock />;
  }

  return <>{children}</>;
}
