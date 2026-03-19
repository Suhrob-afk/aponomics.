"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Bookmark, BookmarkCheck, MessageCircle, Heart, Share2 } from "lucide-react"

const supabase = createClient()

export default function ArticleActions({
   articleId,
  slug,
  initialLikes,
  initialComments,
}: { 
  articleId: string
  slug: string
  initialLikes: number
  initialComments: number
}) {
  
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [commentCount] = useState(initialComments)
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkIfSaved() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error("Error getting user:", userError)
          return
        }

        const user = userData.user
        if (!user) return

        const { data, error } = await supabase
          .from("saved_articles")
          .select("id")
          .eq("user_id", user.id)
          .eq("article_id", articleId)
          .maybeSingle()

        if (error) {
          console.error("Error checking saved article:", error)
          return
        }

        setIsSaved(Boolean(data))
      } catch (error) {
        console.error("Unexpected error checking saved article:", error)
      }
    }

    checkIfSaved()
  }, [articleId])


  async function handleLike() {

  const { data: userData } = await supabase.auth.getUser()

  const user = userData.user

  if (!user) {
    alert("Please sign in to like articles")
    return
  }

  const { data: existingLike } = await supabase
    .from("article_likes")
    .select("*")
    .eq("article_id", articleId)
    .eq("user_id", user.id)
    .single()

  if (existingLike) {

    await supabase
      .from("article_likes")
      .delete()
      .eq("article_id", articleId)
      .eq("user_id", user.id)

    setLikeCount(likeCount - 1)

  } else {

    await supabase
      .from("article_likes")
      .insert({
        article_id: articleId,
        user_id: user.id
      })

    setLikeCount(likeCount + 1)

  }

}

  async function handleSave() {
    if (loading) return

    setLoading(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error("Error getting user:", userError)
        return
      }

      const user = userData.user
      if (!user) {
        alert("Please sign in to save articles")
        return
      }

      if (isSaved) {
        const { error } = await supabase
          .from("saved_articles")
          .delete()
          .eq("user_id", user.id)
          .eq("article_id", articleId)

        if (error) {
          console.error("Error unsaving article:", error)
          return
        }

        setIsSaved(false)
      } else {
        const { error } = await supabase
          .from("saved_articles")
          .insert({
            user_id: user.id,
            article_id: articleId,
          })

        if (error) {
          console.error("Error saving article:", error)
          return
        }

        setIsSaved(true)
      }
    } catch (error) {
      console.error("Unexpected save toggle error:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/article/${slug}`

    if (navigator.share) {
      try {
        await navigator.share({ url })
        return
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
      }
    }

    await navigator.clipboard.writeText(url)
    alert("Article link copied!")
  }

  return (
    <div className="flex items-center justify-center gap-8 text-[#6B6B6B]">

      {/* LIKE */}
      <button
        onClick={handleLike}
        className="flex items-center gap-1.5 text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
      >
        <Heart className="w-5 h-5" strokeWidth={1.8} />
        <span className="text-sm font-serif">{likeCount}</span>
      </button>


      {/* COMMENT */}
      <button
        className="flex items-center gap-1.5 text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
      >
        <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
        <span className="text-sm font-serif">{commentCount}</span>
      </button>


      {/* SHARE */}
      <button
        onClick={handleShare}
        className="flex items-center text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
      >
        <Share2 className="w-5 h-5" strokeWidth={1.8} />
      </button>

      {/* SAVE */}
      <button
        onClick={handleSave}
        disabled={loading}
        className={`flex items-center disabled:opacity-50 transition-colors cursor-pointer ${
          isSaved ? "text-[#1F1F1F]" : "text-[#6B6B6B] hover:text-[#1F1F1F]"
        }`}
      >
        {isSaved ? (
          <BookmarkCheck className="w-5 h-5" strokeWidth={1.8} />
        ) : (
          <Bookmark className="w-5 h-5" strokeWidth={1.8} />
        )}
      </button>

    </div>
  )
}