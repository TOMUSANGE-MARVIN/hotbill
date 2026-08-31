<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Platform-level blog (marketing site). Not tenant-scoped - posts are authored
 * by platform super-admins and shown on the public site at /blogs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category')->nullable();
            $table->text('excerpt')->nullable();
            $table->longText('content')->nullable();     // rendered HTML from the editor
            $table->string('cover_image')->nullable();   // public URL

            $table->string('status')->default('draft')->index(); // draft | published
            $table->timestamp('published_at')->nullable()->index();

            // Author (denormalised name so posts survive user changes / are editable)
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_name')->nullable();

            $table->unsignedSmallInteger('reading_time')->default(1); // minutes
            $table->unsignedInteger('views')->default(0);

            // SEO
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->string('og_image')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
