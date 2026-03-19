import { createClient } from "@/lib/supabase"
import Link from "next/link"


export default async function HomePage() {


 const supabase = createClient()


 const { data: articles } = await supabase
   .from("articles")
   .select("*")
   .order("created_at", { ascending: false })
   .limit(7)


 const featured = articles?.[0]
 const secondary = articles?.slice(1,4)
 const latest = articles?.slice(4,7)


 return (
   <main className="max-w-6xl mx-auto px-6 py-16">


     {/* FEATURED */}
     <section className="mb-20">
       <Link href={`/article/${featured.slug}`}
       className="block hover:opacity-70 transition cursor-pointer"
       >
       {featured.cover_image && (
 <img
   src={featured.cover_image}
   className="w-full h-[420px] object-cover rounded-lg mb-6"
 />
)}


         <h1 className="text-4xl font-serif mb-2">
           {featured.title}
         </h1>


         <p className="text-sm text-gray-600">
           By {featured.author}
         </p>
       </Link>
     </section>




     {/* SECONDARY */}
     <section className="grid md:grid-cols-3 gap-10 mb-20">
       {secondary?.map((article) => (


         <Link key={article.id} href={`/article/${article.slug}`}
          className="block hover:opacity-70 transition cursor-pointer"
          >
{article.cover_image && (
 <img
   src={article.cover_image}
   className="w-full h-[200px] object-cover rounded-md mb-3 transition duration-200"
 />
)}
           <h3 className="font-serif text-xl">
             {article.title}
           </h3>


           <p className="text-sm text-gray-600">
             {article.author}
           </p>
         </Link>
       ))}
     </section>

     {/* THEMES */}
     <section className="mb-24 text-center">


       <p className="uppercase tracking-widest text-sm mb-6">
         Themes
       </p>


       <div className="flex justify-center gap-10 text-lg font-serif flex-wrap">


     <Link
       href="/theme/markets"
       className="text-[#2f5d50] hover:underline hover:opacity-70 cursor-pointer"
     >
      Markets
     </Link>
        
     <Link
      href="/theme/growth"
      className="text-[#b48a3c] hover:underline hover:opacity-70 cursor-pointer"
     >
     Growth
     </Link>
        
    <Link
     href="/theme/policy"
     className="text-[#2c3e5a] hover:underline hover:opacity-70 cursor-pointer"
   >
     Policy
     </Link>  


   <Link
    href="/theme/society"
    className="text-[#a45a3a] hover:underline hover:opacity-70 cursor-pointer"
   >
    Society
    </Link>  


   <Link
    href="/theme/future"
    className="text-[#6b5aa6] hover:underline hover:opacity-70 cursor-pointer"
   >
    Future 
    </Link>  
      </div>


     </section>




     {/* LATEST */}
     <section>


       <h2 className="text-2xl font-serif mb-8">
         Latest Articles
       </h2>


       <div className="space-y-10 max-w-3xl">
        
         {latest?.map((article) => (


           <Link
             key={article.id}
             href={`/article/${article.slug}`}
             className="block border-b pb-6 hover:opacity-70 transition cursor-pointer"
           >


             <h3 className="font-serif text-xl">
               {article.title}
             </h3>


             <p className="text-sm text-gray-600">
               {article.author}
             </p>


           </Link>


         ))}


       </div>


     </section>


   </main>
 )
}

