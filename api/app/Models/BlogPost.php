<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogPost extends Model
{
    protected $fillable = [
        'title', 'slug', 'category', 'excerpt', 'content', 'cover_image',
        'status', 'published_at', 'author_id', 'author_name',
        'reading_time', 'views', 'meta_title', 'meta_description', 'og_image',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'reading_time' => 'integer',
        'views' => 'integer',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** Only published posts whose publish time has arrived. */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    /** Estimate reading time (minutes) from rendered HTML. */
    public static function estimateReadingTime(?string $html): int
    {
        $words = str_word_count(strip_tags((string) $html));

        return max(1, (int) ceil($words / 200));
    }
}
