"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RootLayout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LockdownGate } from "@/components/LockdownGate";

function Gate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const deniedAt = useRef<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated" || status === "denied") {
      if (deniedAt.current === null) deniedAt.current = Date.now();
      const delay = status === "denied" ? 50 : 800;
      const t = setTimeout(() => router.replace("/login"), delay);
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

  return (
    <ErrorBoundary>
      <LockdownGate>
        <RootLayout>{children}</RootLayout>
      </LockdownGate>
    </ErrorBoundary>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
