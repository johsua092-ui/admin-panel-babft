"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Server,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/servers", label: "Servers", icon: Server },
];

export function RootLayout({ children }: { children: ReactNode }) {
  const { admin, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-bg-base text-fg-primary">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 transform border-r border-bg-border bg-bg-panel transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-bg-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft text-accent">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">BABFT</div>
            <div className="text-2xs text-fg-dim">Admin Console</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-bg-panel2 text-accent"
                    : "text-fg-muted hover:bg-bg-panel2 hover:text-fg-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-bg-border p-2">
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-panel2">
              <ShieldCheck className="h-4 w-4 text-ok" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-medium">{admin?.email}</div>
              <div className="text-2xs text-fg-dim">{admin?.role ?? "admin"}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-panel2 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-bg-border bg-bg-base/95 px-4 backdrop-blur lg:px-6">
          <button
            className="rounded-md p-2 text-fg-muted hover:bg-bg-panel2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="text-sm font-semibold">Admin Panel</div>
          <div className="ml-auto flex items-center gap-2 text-2xs text-fg-dim">
            <span className="rounded border border-bg-border px-2 py-1">
              Firebase · Vercel
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
