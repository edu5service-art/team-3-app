"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/supabase";

type PostFormProps = {
  onCreated: (post: Post) => void;
};

export default function PostForm({ onCreated }: PostFormProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim() || !content.trim()) {
      setError("이름, 제목, 내용을 모두 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({ name: name.trim(), title: title.trim(), content: content.trim() })
      .select()
      .single();

    setSubmitting(false);

    if (insertError) {
      setError("글 등록에 실패했습니다: " + insertError.message);
      return;
    }

    onCreated(data as Post);
    setName("");
    setTitle("");
    setContent("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5"
    >
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
          이름
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
          제목
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div>
        <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-slate-700">
          내용
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          rows={5}
          className="w-full resize-none rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "글 등록"}
        </button>
      </div>
    </form>
  );
}
