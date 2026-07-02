'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import PostEditor, { type PostForm } from '@/components/admin/blog/PostEditor'

export default function EditPostPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data, isLoading, isError } = useQuery<{ post: PostForm & { id: number } }>({
    queryKey: ['admin-blog', id],
    queryFn: () => api.get(`/admin/blog/posts/${id}`).then((r) => r.data),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }
  if (isError || !data) {
    return <div className="text-center text-sm text-gray-500 py-16">Post not found.</div>
  }

  const p = data.post
  const initial: PostForm = {
    id: p.id,
    title: p.title ?? '',
    slug: p.slug ?? '',
    category: p.category ?? '',
    excerpt: p.excerpt ?? '',
    content: p.content ?? '',
    cover_image: p.cover_image ?? '',
    status: (p.status as 'draft' | 'published') ?? 'draft',
    author_name: p.author_name ?? '',
    meta_title: p.meta_title ?? '',
    meta_description: p.meta_description ?? '',
    og_image: p.og_image ?? '',
  }

  return <PostEditor initial={initial} />
}
