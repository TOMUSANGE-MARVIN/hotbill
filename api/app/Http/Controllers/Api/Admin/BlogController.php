<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Platform super-admin blog CMS - full CRUD over posts plus image uploads.
 * Gated by the platform.admin middleware.
 */
class BlogController extends Controller
{
    /** All posts (drafts included), newest first. */
    public function index(Request $request): JsonResponse
    {
        $query = BlogPost::query()->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(min((int) $request->query('per_page', 20), 100)));
    }

    public function show(BlogPost $post): JsonResponse
    {
        return response()->json(['post' => $post]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePost($request);

        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['title']);
        $data['reading_time'] = BlogPost::estimateReadingTime($data['content'] ?? null);
        $data['author_id'] = $request->user()->id;
        $data['author_name'] = $data['author_name'] ?? $request->user()->name;
        $data['published_at'] = $this->resolvePublishedAt($data, null);

        $post = BlogPost::create($data);

        return response()->json(['post' => $post], 201);
    }

    public function update(Request $request, BlogPost $post): JsonResponse
    {
        $data = $this->validatePost($request, $post->id);

        if (! empty($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $post->id);
        }
        if (array_key_exists('content', $data)) {
            $data['reading_time'] = BlogPost::estimateReadingTime($data['content']);
        }
        $data['published_at'] = $this->resolvePublishedAt($data, $post);

        $post->update($data);

        return response()->json(['post' => $post->fresh()]);
    }

    public function destroy(BlogPost $post): JsonResponse
    {
        $post->delete();

        return response()->json(['message' => 'Post deleted']);
    }

    /** Upload an image (cover or inline) → returns its public URL. */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'], // 5 MB
        ]);

        $path = $request->file('image')->store('blog', 'public');

        return response()->json([
            'url'  => Storage::disk('public')->url($path),
            'path' => $path,
        ], 201);
    }

    // ── helpers ──────────────────────────────────────────

    private function validatePost(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'title'            => ['required', 'string', 'max:255'],
            'slug'             => ['nullable', 'string', 'max:255', 'alpha_dash'],
            'category'         => ['nullable', 'string', 'max:80'],
            'excerpt'          => ['nullable', 'string', 'max:500'],
            'content'          => ['nullable', 'string'],
            'cover_image'      => ['nullable', 'string', 'max:1000'],
            'status'           => ['required', Rule::in(['draft', 'published'])],
            'author_name'      => ['nullable', 'string', 'max:120'],
            'meta_title'       => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'og_image'         => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function uniqueSlug(string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source) ?: Str::random(8);
        $slug = $base;
        $i = 2;

        while (BlogPost::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    /**
     * Set published_at the first time a post goes live; keep the original date on
     * subsequent edits; clear it when moved back to draft.
     */
    private function resolvePublishedAt(array $data, ?BlogPost $post)
    {
        if (($data['status'] ?? null) !== 'published') {
            return null;
        }

        return $post?->published_at ?? now();
    }
}
