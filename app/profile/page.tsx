"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, getUserProfile, type UserProfile } from "@/lib/user";

type ProfileFormState = {
  full_name: string;
  username: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState<ProfileFormState>({
    full_name: "",
    username: "",
  });

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

        const profile = await getUserProfile(user.id);

        if (!isMounted) return;
        setUserId(user.id);
        setUserProfile(profile);
        setForm({
          full_name: profile?.full_name ?? "",
          username: profile?.username ?? "",
        });
      } catch (e) {
        console.error(e);
        if (!isMounted) return;
        setError("Something went wrong while loading your profile.");
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

  async function handleSave() {
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          username: form.username.trim(),
        })
        .eq("id", userId)
        .select("id, username, full_name, avatar_url, created_at")
        .single();

      if (error) throw error;

      setUserProfile(data as UserProfile);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setError("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const avatarUrl = userProfile?.avatar_url;
  const avatarFallbackInitial = userProfile?.username?.charAt(0)?.toUpperCase() || "U";

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-serif mb-2">Profile</h1>
          <p className="text-sm text-[#6B6B6B]">Manage your public info.</p>
        </div>

        {!isEditing && !loading && !!userProfile && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setForm({
                full_name: userProfile?.full_name ?? "",
                username: userProfile?.username ?? "",
              });
            }}
            className="border border-[#D6D0C4] px-5 py-2 text-sm hover:opacity-70 transition rounded-md bg-transparent"
          >
            Edit Profile
          </button>
        )}
      </div>

      {loading ? (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60 animate-pulse">
          <div className="flex gap-6 items-center">
            <div className="w-20 h-20 rounded-full bg-[#D6D0C4]" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-2/3 bg-[#D6D0C4] rounded" />
              <div className="h-4 w-1/2 bg-[#D6D0C4] rounded" />
              <div className="h-9 w-32 bg-[#D6D0C4] rounded" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      ) : !userProfile ? (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60">
          <p className="text-sm text-[#6B6B6B] mb-4">No profile found yet.</p>
          <p className="text-sm text-[#6B6B6B]">
            If you just created your account, this may take a moment.
          </p>
        </div>
      ) : isEditing ? (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60">
          <div className="grid md:grid-cols-[120px_1fr] gap-8 items-start">
            <div className="flex flex-col items-start gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#D6D0C4] flex items-center justify-center text-lg font-serif text-[#1A1A1A]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarFallbackInitial
                )}
              </div>
              <p className="text-xs tracking-[0.18em] uppercase text-[#7A7462]">Avatar</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs tracking-[0.18em] uppercase text-[#7A7462]">
                  Full name
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full border border-[#D6D0C4] rounded-md px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-[#2F5D50]"
                  placeholder="e.g., Alex Morgan"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs tracking-[0.18em] uppercase text-[#7A7462]">
                  Username
                </label>
                <input
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full border border-[#D6D0C4] rounded-md px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-[#2F5D50]"
                  placeholder="e.g., alex"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.username.trim()}
                  className="border border-[#1A1A1A] px-5 py-2 text-sm hover:opacity-70 transition rounded-md bg-[#1A1A1A] text-[#F4F1EA] disabled:opacity-50 disabled:hover:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="border border-[#D6D0C4] px-5 py-2 text-sm hover:opacity-70 transition rounded-md bg-transparent disabled:opacity-50 disabled:hover:opacity-50"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60">
          <div className="grid md:grid-cols-[120px_1fr] gap-8 items-start">
            <div className="flex flex-col items-start gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#D6D0C4] flex items-center justify-center text-lg font-serif text-[#1A1A1A]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarFallbackInitial
                )}
              </div>
              <p className="text-xs tracking-[0.18em] uppercase text-[#7A7462]">Avatar</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs tracking-[0.18em] uppercase text-[#7A7462]">Full name</p>
                <p className="text-2xl font-serif">{userProfile.full_name ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs tracking-[0.18em] uppercase text-[#7A7462]">Username</p>
                <p className="text-lg font-serif text-[#2F5D50]">@{userProfile.username}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

