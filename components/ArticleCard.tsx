import Link from "next/link";

type Article = {
  id: number;
  title: string;
  slug: string;
  author: string;
  theme?: string | null;
};

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const themeLabel = (article.theme || "APonomics").toUpperCase();

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group block h-full"
    >
      <article className="h-full border-t border-[#D6D0C4] pt-4 md:pt-5">
        <div className="text-[10px] tracking-[0.24em] uppercase text-[#2F5E4E] mb-2">
          {themeLabel}
        </div>
        <h2 className="font-serif text-2xl leading-snug tracking-tight text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors mb-2">
          {article.title}
        </h2>
        <div className="text-[13px] text-[#777062]">
          By <span className="font-medium text-[#433C30]">{article.author}</span>
        </div>
      </article>
    </Link>
  );
}

