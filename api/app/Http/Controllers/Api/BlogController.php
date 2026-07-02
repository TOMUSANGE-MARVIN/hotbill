<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public, unauthenticated blog reads for the marketing site (/blogs).
 * Only published posts are ever exposed here.
 */
class BlogController extends Controller
{
    /** Paginated list of published posts, newest first, optional ?category= filter. */
    public function index(Request $request): JsonResponse
    {
        $query = BlogPost::published()
            ->select([
                'id', 'title', 'slug', 'category', 'excerpt', 'cover_image',
                'author_name', 'reading_time', 'published_at',
            ])
            ->orderByDesc('published_at');

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $posts = $query->paginate(min((int) $request->query('per_page', 12), 50));

        return response()->json($posts);
    }

    /** Distinct categories that have at least one published post. */
    public function categories(): JsonResponse
    {
        $categories = BlogPost::published()
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json(['categories' => $categories]);
    }

    /** Single published post by slug (also bumps the view counter). */
    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::published()->where('slug', $slug)->firstOrFail();

        // Non-blocking-ish view bump (no timestamps touched).
        BlogPost::whereKey($post->id)->update(['views' => $post->views + 1]);

        return response()->json(['post' => $post]);
    }
}
