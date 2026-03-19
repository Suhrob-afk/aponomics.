import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  return data.user ?? null;
}

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const supabase = createClient();

  const { data: authData, error: authError } = userId
    ? { data: { user: { id: userId } }, error: null }
    : await supabase.auth.getUser();

  if (authError) throw authError;
  const id = userId ?? authData.user?.id;
  if (!id) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, created_at")
    .eq("id", id)
    .single();

  if (error) {
    // No row found
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return profile as UserProfile | null;
}

