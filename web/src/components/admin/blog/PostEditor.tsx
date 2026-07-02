'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import RichTextEditor from './RichTextEditor'
import { ArrowLeft, ImagePlus, Loader2, Save, X } from 'lucide-react'
import Link from 'next/link'

export interface PostForm {
  id?: number
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  cover_image: string
  status: 'draft' | 'published'
  author_name: string
  meta_title: string
  meta_description: string
  og_image: string
}

const EMPTY: PostForm = {
  title: '', slug: '', category: '', excerpt: '', content: '', cover_image: '',
  status: 'draft', author_name: '', meta_title: '', meta_description: '', og_image: '',
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const label = 'block text-sm font-medium text-gray-700 mb-1.5'
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition'

export default function PostEditor({ initial }: { initial?: PostForm }) {
  const router = useRouter()
  const qc = useQueryClient()
  const isEdit = !!initial?.id
  const [form, setForm] = useState<PostForm>(initial ?? EMPTY)
  // Whether the user has hand-edited the slug (stop auto-deriving it from title)
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [error, setError] = useState('')

  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: async (status: 'draft' | 'published') => {
      const payload = { ...form, status }
      if (isEdit) return api.put(`/admin/blog/posts/${initial!.id}`, payload).then((r) => r.data)
      return api.post('/admin/blog/posts', payload).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog'] })
      router.push('/admin/blog')
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Could not save the post. Check the fields and try again.')
    },
  })

  const persist = (status: 'draft' | 'published') => {
    setError('')
    if (!form.title.trim()) { setError('A title is required.'); return }
    setForm((f) => ({ ...f, status }))
    save.mutate(status)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Back to posts
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => persist('draft')}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Save size={15} /> Save draft
          </button>
          <button
            onClick={() => persist('published')}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {form.status === 'published' && isEdit ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit post' : 'New post'}</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Main column */}
        <div className="space-y-4">
          <div>
            <label className={label}>Title</label>
            <input
              className={`${input} text-lg font-semibold`}
              value={form.title}
              placeholder="Your headline"
              onChange={(e) => {
                const title = e.target.value
                setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }))
              }}
            />
          </div>

          <div>
            <label className={label}>Content</label>
            <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <SidebarCard title="Cover image">
            <CoverPicker value={form.cover_image} onChange={(url) => set('cover_image', url)} />
          </SidebarCard>

          <SidebarCard title="Details">
            <div className="space-y-3">
              <div>
                <label className={label}>Slug</label>
                <input
                  className={input}
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }}
                  placeholder="auto-from-title"
                />
              </div>
              <div>
                <label className={label}>Category</label>
                <input className={input} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Guides, Product…" />
              </div>
              <div>
                <label className={label}>Author</label>
                <input className={input} value={form.author_name} onChange={(e) => set('author_name', e.target.value)} placeholder="Defaults to you" />
              </div>
              <div>
                <label className={label}>Excerpt</label>
                <textarea className={`${input} resize-none`} rows={3} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="Short summary shown in listings & search results." />
                <p className="text-xs text-gray-400 mt-1">{form.excerpt.length}/500</p>
              </div>
            </div>
          </SidebarCard>

          <SidebarCard title="SEO">
            <div className="space-y-3">
              <div>
                <label className={label}>Meta title</label>
                <input className={input} value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} placeholder="Defaults to the title" />
              </div>
              <div>
                <label className={label}>Meta description</label>
                <textarea className={`${input} resize-none`} rows={3} value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} placeholder="Defaults to the excerpt" />
              </div>
              <div>
                <label className={label}>Social share image</label>
                <CoverPicker value={form.og_image} onChange={(url) => set('og_image', url)} compact />
                <p className="text-xs text-gray-400 mt-1">Falls back to the cover image.</p>
              </div>
            </div>
          </SidebarCard>
        </div>
      </div>
    </div>
  )
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

function CoverPicker({ value, onChange, compact }: { value: string; onChange: (url: string) => void; compact?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post('/admin/blog/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(res.data.url)
    } catch {
      alert('Upload failed. Max size is 5 MB.')
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="cover" className={`w-full ${compact ? 'h-24' : 'h-36'} object-cover rounded-lg border border-gray-200`} />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
          title="Remove"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`w-full ${compact ? 'h-24' : 'h-36'} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition`}
      >
        {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
        <span className="text-xs">{uploading ? 'Uploading…' : 'Upload image'}</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }}
      />
    </>
  )
}
