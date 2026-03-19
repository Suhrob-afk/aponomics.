"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();

      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth error:", error);
      }

      router.replace("/");
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
      <p>Signing you in...</p>
    </div>
  );
}