"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RootLayout } from "@/components/Layout";

function Gate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || status === "denied") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "checking" || status === "unauthenticated" || status === "denied") {
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
