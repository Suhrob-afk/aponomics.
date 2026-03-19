import { createClient } from "@/lib/supabase"
import { ArticleCard } from "@/components/ArticleCard"

type ArticleFromDb = {
  id: number;
  title: string;
  slug: string;
  author: string;
  theme?: string | null;
  article_likes?: unknown[] | null;
};

export default async function PopularPage() {

  const supabase = createClient()

  const { data: articles } = await supabase
    .from("articles")
    .select(`
      *,
      article_likes(count)
    `)
    .eq("published", true)

    const sorted = (articles as ArticleFromDb[] | null | undefined)
      ?.map((article) => ({
        ...article,
        likes: article.article_likes?.length ?? 0,
      }))
      .filter((article) => article.likes > 0)
      .sort((a, b) => b.likes - a.likes)

  return (
    <div className="max-w-3xl mx-auto mt-16 space-y-10">

      <h1 className="text-4xl font-serif">
        Popular Articles
      </h1>

      {sorted?.map(article => (
        <ArticleCard
          key={article.id}
          article={article}
        />
      ))}

    </div>
  )
}