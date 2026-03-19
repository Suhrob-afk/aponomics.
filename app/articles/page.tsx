import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Article = {
  title: string;
  slug: string;
  author: string;
  created_at: string;
};

export default async function ArticlesPage() {
  const supabase = createClient();

  const { data: articles, error } = await supabase
    .from("articles")
    .select("title, slug, author, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching articles:", error);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-serif mb-6">Articles</h1>
      <p className="text-[#6B6B6B] mb-10">
        In-depth pieces, commentary, and analysis exploring key topics in
        economics and policy.
      </p>

      <section className="space-y-10">
        {(articles ?? []).map((article: Article) => (
          
          <article
  key={article.slug}
  className="space-y-1 hover:opacity-70 transition cursor-pointer"
>
  <Link href={`/article/${article.slug}`}>
    <h2 className="text-2xl font-serif">{article.title}</h2>
  </Link>

  <p className="text-sm text-[#6B6B6B]">{article.author}</p>
</article>
        
        ))}
      </section>
    </main>
  );
}
