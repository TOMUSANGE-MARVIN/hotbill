'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2, FileText, ExternalLink } from 'lucide-react'

interface Post {
  id: number
  title: string
  slug: string
  category: string | null
  status: 'draft' | 'published'
  views: number
  published_at: string | null
  created_at: string
}

export default function BlogAdminPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ data: Post[] }>({
    queryKey: ['admin-blog'],
    queryFn: () => api.get('/admin/blog/posts').then((r) => r.data),
  })
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/blog/posts/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); setConfirmId(null) },
  })

  const posts = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-sm text-gray-500 mt-0.5">Write and publish posts for the marketing site.</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> New post
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Title', 'Category', 'Status', 'Views', 'Date', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText className="mx-auto text-gray-300 mb-2" size={28} />
                    <p className="text-sm text-gray-500">No posts yet. Write your first one.</p>
                  </td>
                </tr>
              )}
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.title}</div>
                    <div className="text-xs text-gray-400">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'published' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.views}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {format(new Date(p.published_at ?? p.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'published' && (
                        <a
                          href={`/blogs/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                          title="View live"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                      <Link
                        href={`/admin/blog/${p.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-brand-600 rounded-md hover:bg-gray-100"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => setConfirmId(p.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Delete this post?</h3>
            <p className="text-sm text-gray-500 mb-4">This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => del.mutate(confirmId)}
                disabled={del.isPending}
                className="text-sm px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {del.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
