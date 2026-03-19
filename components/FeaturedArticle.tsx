import Link from "next/link";

type Article = {
  id: number;
  title: string;
  slug: string;
  author: string;
  theme?: string | null;
  content?: string | null;
};

interface FeaturedArticleProps {
  article: Article;
}

function getExcerpt(content: string | null | undefined, maxLength = 180) {
  if (!content) return "";
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  const shortened = trimmed.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 80 ? lastSpace : maxLength)}…`;
}

export function FeaturedArticle({ article }: FeaturedArticleProps) {
  const themeLabel = (article.theme || "APonomics").toUpperCase();
  const excerpt = getExcerpt(article.content);

  return (
    <section className="py-10 md:py-16">
      <article className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14 bg-[#F4F1EA] border border-[#D6D0C4] rounded-sm">
        <div className="mb-4 md:mb-5 text-center">
          <div className="text-[11px] md:text-xs tracking-[0.24em] uppercase text-[#2F5E4E] mb-3">
            {themeLabel}
          </div>
          <Link href={`/article/${article.slug}`} className="group inline-block">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">
              {article.title}
            </h1>
          </Link>
        </div>

        {excerpt && (
          <p className="mt-3 md:mt-4 text-base md:text-lg leading-relaxed text-[#4A4336] max-w-2xl mx-auto text-center">
            {excerpt}
          </p>
        )}

        <div className="mt-6 md:mt-8 text-sm md:text-base text-center text-[#777062]">
          By{" "}
          <span className="font-medium text-[#433C30]">{article.author}</span>
        </div>
      </article>
    </section>
  );
}

