import { createClient } from "@/lib/supabase";
import ArticleActions from "@/components/ArticleActions"
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {

  const { slug } = await params;

  const supabase = createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, view_count, like_count, share_count, comment_count")
    .eq("slug", slug)
    .maybeSingle();

  if (!article) {
    return <div className="text-center mt-20">Article not found</div>;
  }
  
  const viewCount = article.view_count ?? 0;
  const likeCount = article.like_count ?? 0;
  const shareCount = article.share_count ?? 0;
  const commentCount = article.comment_count ?? 0;

  const words = article.content.split(/\s+/).length
  const readingTime = Math.max(1, Math.ceil(words / 200))

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">

      <p className="text-sm uppercase tracking-widest text-[#2F5E4E]">
        {article.theme}
      </p>
      
      {article.cover_image && (
  <div className="max-w-xl mx-auto mb-8">
  <img
    src={article.cover_image}
    alt={article.title}
    className="w-full h-[100px] object-cover rounded-2xl"
  />
</div>
)}
      <h1 className="font-serif text-5xl mt-4 leading-tight">
        {article.title}
      </h1>

      <div className="text-[14px] text-[#6B6B6B] mt-2 space-y-1">
  <p>By {article.author}</p>

  <p>
    Published{" "}
    {new Date(article.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}{" "}
    • {readingTime} min read
  </p>
</div>

<article
  className="mt-12 text-lg leading-relaxed whitespace-pre-line
  [&_img]:my-10
  [&_img]:rounded-lg
  [&_img]:max-w-3xl
  [&_img]:mx-auto
  [&_img]:h-auto"
  dangerouslySetInnerHTML={{ __html: article.content }}
/>

<section className="mt-8 pt-4 border-t border-gray-200">
  
<ArticleActions
articleId={article.id}
slug={article.slug}
initialLikes={article.like_count ?? 0}
initialComments={article.comment_count ?? 0}
/>

</section>


</main>
);
}