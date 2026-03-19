"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const supabase = createClient()

export default function ArticleActions({
   articleId,
  initialLikes,
  initialComments,
}: { 
  articleId: string
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

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    alert("Article link copied!")
  }

  return (
    <div className="flex items-center justify-center gap-10 text-[#3A3A3A]">

      {/* LIKE */}
      <button
        onClick={handleLike}
        className="flex items-center gap-1 hover:opacity-70 transition cursor-pointer"
      >
        <span className="text-[18px]">♡</span>
        <span className="text-sm font-serif">{likeCount}</span>
      </button>


      {/* COMMENT */}
      <button
        className="flex items-center gap-1 hover:opacity-70 transition cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12c0 4.418-4.03 8-9 8-1.38 0-2.69-.238-3.86-.67L3 20l1.04-3.12C3.39 15.61 3 13.86 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        <span className="text-sm font-serif">{commentCount}</span>
      </button>


      {/* SHARE */}
      <button
        onClick={handleShare}
        className="flex items-center hover:opacity-70 transition cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 8l5 4-5 4M20 12H9a5 5 0 100 10"
          />
        </svg>
      </button>

      {/* SAVE */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-1 hover:opacity-70 transition cursor-pointer disabled:opacity-50"
      >
        <span className="text-[18px]">{isSaved ? "🔖" : "📑"}</span>
        <span className="text-sm font-serif">
          {loading ? "..." : isSaved ? "Saved" : "Save"}
        </span>
      </button>

    </div>
  )
}