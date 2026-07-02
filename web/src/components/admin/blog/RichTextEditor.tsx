'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useRef } from 'react'
import api from '@/lib/api'
import {
  Bold, Italic, Strikethrough, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link as LinkIcon, Image as ImageIcon, Undo, Redo, Minus,
} from 'lucide-react'

/** Upload a file to the blog image endpoint and return its public URL. */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await api.post('/admin/blog/uploads', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url as string
}

function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
        active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const addImage = useCallback(async (file: File) => {
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch {
      alert('Image upload failed. Please try a smaller image (max 5 MB).')
    }
  }, [editor])

  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const div = <span className="w-px h-5 bg-gray-200 mx-0.5" />

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 p-2 sticky top-0 bg-white z-10 rounded-t-xl">
      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
      {div}
      <ToolbarButton title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
      <ToolbarButton title="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarButton>
      {div}
      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
      <ToolbarButton title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={16} /></ToolbarButton>
      <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></ToolbarButton>
      {div}
      <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}><LinkIcon size={16} /></ToolbarButton>
      <ToolbarButton title="Insert image" onClick={() => fileRef.current?.click()}><ImageIcon size={16} /></ToolbarButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) addImage(f)
          e.target.value = ''
        }}
      />
      {div}
      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo size={16} /></ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo size={16} /></ToolbarButton>
    </div>
  )
}

export default function RichTextEditor({
  value, onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg' } }),
      Placeholder.configure({ placeholder: 'Write your story…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'blog-content min-h-[420px] px-5 py-4 focus:outline-none',
      },
    },
  })

  if (!editor) {
    return <div className="border border-gray-200 rounded-xl min-h-[480px] animate-pulse bg-gray-50" />
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
