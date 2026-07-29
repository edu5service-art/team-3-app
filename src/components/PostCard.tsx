import type { Post } from "@/lib/supabase";

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <h2 className="text-lg font-semibold text-slate-900 break-words">{post.title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
        {post.content}
      </p>
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span className="font-medium text-slate-500">{post.name}</span>
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
      </div>
    </article>
  );
}
