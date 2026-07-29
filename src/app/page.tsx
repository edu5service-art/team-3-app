"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/supabase";
import PostForm from "@/components/PostForm";
import PostCard from "@/components/PostCard";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("글 목록을 불러오지 못했습니다: " + fetchError.message);
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const handleCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-24">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">게시판</h1>
        <p className="mt-3 text-sm text-slate-500">
          이름, 제목, 내용을 입력해서 새로운 글을 남겨보세요.
        </p>
      </header>

      <PostForm onCreated={handleCreated} />

      <section className="mt-16 space-y-5">
        {loading && (
          <p className="text-center text-sm text-slate-400">불러오는 중...</p>
        )}

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        {!loading && !error && posts.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            아직 등록된 글이 없습니다. 첫 글을 남겨보세요.
          </p>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </main>
  );
}
