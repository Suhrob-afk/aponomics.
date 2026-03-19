"use client";

import { createClient } from "@/lib/supabase";

export default function SignInPage() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-[#F4F1EA] text-[#1A1A1A]">
      <div className="w-full max-w-md mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-center mb-8">
          Sign in to Aponomics
        </h1>

        <div className="flex flex-col gap-4">
          <button
            onClick={signInWithGoogle}
            className="w-full border border-[#1A1A1A] py-3 text-sm tracking-[0.18em] uppercase bg-transparent hover:bg-[#1A1A1A] hover:text-[#F4F1EA] transition"
          >
            Continue with Google
          </button>

        </div>
      </div>
    </main>
  );
}