"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/user";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace("/signin");
          return;
        }
      } catch (e) {
        console.error(e);
        if (!isMounted) return;
        setError("Something went wrong while loading settings.");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/signin");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-8">
        <h1 className="text-4xl font-serif mb-2">Settings</h1>
        <p className="text-sm text-[#6B6B6B]">Account preferences.</p>
      </div>

      {loading ? (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60 animate-pulse">
          <div className="h-4 w-1/3 bg-[#D6D0C4] rounded mb-4" />
          <div className="h-10 w-full bg-[#D6D0C4] rounded" />
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60">
          <div className="space-y-4">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center w-full border border-[#D6D0C4] px-5 py-2 text-sm hover:opacity-70 transition rounded-md bg-transparent"
            >
              Edit Profile
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center justify-center w-full border border-[#1A1A1A] px-5 py-2 text-sm hover:opacity-70 transition rounded-md bg-transparent disabled:opacity-50 disabled:hover:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

