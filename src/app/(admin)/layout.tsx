"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RootLayout } from "@/components/Layout";

function Gate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  // Grace period: jangan langsung redirect saat status berubah ke
  // "unauthenticated" sesaat (mis. saat Firebase restore session / reload).
  const deniedAt = useRef<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated" || status === "denied") {
      if (deniedAt.current === null) deniedAt.current = Date.now();
      const delay = status === "denied" ? 50 : 800; // unauthenticated dapat grace 800ms
      const t = setTimeout(() => {
        router.replace("/login");
      }, delay);
      return () => clearTimeout(t);
    }
    deniedAt.current = null;
  }, [status, router]);

  if (
    status === "loading" ||
    status === "checking" ||
    status === "unauthenticated" ||
    status === "denied"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <RootLayout>{children}</RootLayout>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
