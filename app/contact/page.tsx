import { createClient } from "@/lib/supabase"

export default async function AboutPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", "contact")
    .maybeSingle()

  console.log("ALL DATA:", data)
  console.log("ERROR:", error)

  if (!data) {
    return <div>No content found.</div>
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1A1A1A]">
      <main className="max-w-3xl mx-auto px-6 md:px-8 pt-24 pb-20">
        <h1 className="text-4xl md:text-5xl font-serif text-[#0F5C4A] mb-10">
          {data.title}
        </h1>

        <div className="text-[18px] leading-relaxed whitespace-pre-line space-y-6">
          {data.content}
        </div>
      </main>
    </div>
  )
}