"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ShieldCheck, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { status, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-bg-border bg-bg-panel p-6">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">BABFT Admin Console</h1>
              <p className="text-2xs text-fg-dim">
                Restricted access · authorized personnel only
              </p>
            </div>
          </div>

          {status === "denied" && (
            <div className="mb-4 flex items-start gap-2 rounded border border-[#5b1f1f] bg-[#331414] p-3 text-xs text-danger">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Access denied. Akun Google ini tidak terdaftar sebagai admin.
              </span>
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={status === "checking" || status === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-bg-border bg-bg-panel2 px-4 py-2.5 text-sm font-medium text-fg-primary transition-colors hover:border-fg-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "checking" || status === "loading" ? (
              "Memverifikasi..."
            ) : (
              <>
                <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-white text-[#1a1a1a]">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </span>
                Sign in dengan Google
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-2xs text-fg-dim">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hanya akun Google yang terdaftar di database yang dapat masuk.
          </div>
        </div>
      </div>
    </div>
  );
}
