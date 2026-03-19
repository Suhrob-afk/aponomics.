"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/user";
import { BookmarkCheck, Share2 } from "lucide-react";

type SavedArticle = {
  id: string;
  slug: string;
  title: string;
  author: string;
};

type SavedRow = {
  article_id: string;
};

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
};

export default function SavedArticlesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
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

        const { data: savedRows, error: savedError } = await supabase
          .from("saved_articles")
          .select("article_id")
          .eq("user_id", user.id);

        if (savedError) throw savedError;

        const rows = (savedRows ?? []) as SavedRow[];
        const articleIds = rows.map((r) => r.article_id).filter(Boolean);

        if (articleIds.length === 0) {
          if (!isMounted) return;
          setSavedArticles([]);
          return;
        }

        const { data: articles, error: articlesError } = await supabase
          .from("articles")
          .select("id, slug, title, author")
          .in("id", articleIds);

        if (articlesError) throw articlesError;

        const articleRows = (articles ?? []) as ArticleRow[];
        const articleMap = new Map(
          articleRows.map((a) => [
            a.id,
            { id: a.id, slug: a.slug, title: a.title, author: a.author },
          ]),
        );

        const ordered = rows
          .map((r) => articleMap.get(r.article_id))
          .filter(Boolean) as SavedArticle[];

        if (!isMounted) return;
        setSavedArticles(ordered);
      } catch (e) {
        console.error(e);
        if (!isMounted) return;
        setError("Something went wrong while loading your saved articles.");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleRemove(articleId: string) {
    setRemovingId(articleId);
    setError(null);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/signin");
        return;
      }

      const { error } = await supabase
        .from("saved_articles")
        .delete()
        .eq("user_id", user.id)
        .eq("article_id", articleId);

      if (error) throw error;

      setSavedArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch (e) {
      console.error(e);
      setError("Could not remove the article. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleShare(slug: string) {
    const url = `${window.location.origin}/article/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-8">
        <h1 className="text-4xl font-serif mb-2">Saved Articles</h1>
        <p className="text-sm text-[#6B6B6B]">Your reading list.</p>
      </div>

      {loading ? (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60 animate-pulse">
          <div className="space-y-4">
            <div className="h-4 w-2/3 bg-[#D6D0C4] rounded" />
            <div className="h-4 w-1/2 bg-[#D6D0C4] rounded" />
            <div className="h-4 w-5/6 bg-[#D6D0C4] rounded" />
          </div>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      ) : savedArticles.length === 0 ? (
        <div className="border border-[#D6D0C4] rounded-lg p-6 bg-white/60">
          <p className="text-sm text-[#6B6B6B]">You haven&apos;t saved any articles yet.</p>
        </div>
      ) : (
        <div className="border border-[#D6D0C4] rounded-lg overflow-hidden bg-white/60">
          <ul className="divide-y divide-[#D6D0C4]">
            {savedArticles.map((article) => (
              <li key={article.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="font-serif text-lg truncate" title={article.title}>
                      {article.title}
                    </p>
                    <p className="text-sm text-[#6B6B6B] mt-1 truncate" title={article.author}>
                      {article.author}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={removingId === article.id}
                      onClick={() => handleRemove(article.id)}
                      className="text-[#1F1F1F] disabled:opacity-50 transition-colors cursor-pointer"
                      aria-label={removingId === article.id ? "Removing saved article" : "Unsave article"}
                      title="Unsave"
                    >
                      <BookmarkCheck className="w-5 h-5" strokeWidth={1.8} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(article.slug)}
                      className="text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
                      aria-label="Share article"
                      title="Share"
                    >
                      <Share2 className="w-5 h-5" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

