import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default async function ThemePage({ params }: { params: Promise<{ theme: string }> }) {

  const { theme } = await params
  const supabase = createClient()

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("theme", theme)
    .order("created_at", { ascending: false })
    
    const themeColors: Record<string, string> = {
      markets: "#2F5E4E",
      growth: "#b48a3c",
      policy: "#2c3e5a",
      society: "#a45a3a",
      future: "#6b5aa6",
    }
  return (
    <main className="max-w-5xl mx-auto px-6 py-20">

    <div className="text-center mb-20">

    <h1
  className="font-serif text-[88px] leading-[1.1] mb-6 capitalize tracking-tight"
  style={{ color: themeColors[theme] }}
>
  {theme}
</h1>

<p
  className="text-xl max-w-xl mx-auto leading-relaxed"
  style={{ color: themeColors[theme] }}
>
      {theme === "markets" && "How incentives and competition shape the economy"}
      {theme === "growth" && "Why nations prosper or stagnate"}
      {theme === "policy" && "The architecture of government decisions"}
      {theme === "society" && "Economic forces shaping everyday life"}
      {theme === "future" && "The next transformations of the global economy"}
     </p>
 </div>
         <div className="grid md:grid-cols-2 gap-x-16 gap-y-12 mt-16">

        {articles?.map((article) => (
          <Link key={article.id} href={`/article/${article.slug}`}>

            <div>
              <h2 className="text-2xl font-serif hover:opacity-70">
                {article.title}
              </h2>

              <p className="text-sm text-gray-600 mt-2">
                By {article.author}
              </p>

            </div>

          </Link>
        ))}

      </div>

    </main>
  )
} 