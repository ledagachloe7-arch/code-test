<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class TaggedCache
{
    public static function remember(
        array $tags,
        string $key,
        mixed $ttl,
        callable $callback
    ): mixed {
        sort($tags);

        $versions = [];

        foreach ($tags as $tag) {
            $versions[$tag] = Cache::rememberForever(
                'tagged_cache_version:' . $tag,
                fn () => (string) Str::uuid()
            );
        }

        $cacheKey = 'tagged_cache:' . md5(
            json_encode([$versions, $key])
        );

        return Cache::remember($cacheKey, $ttl, $callback);
    }

    public static function flush(array $tags): void
    {
        foreach ($tags as $tag) {
            Cache::forever(
                'tagged_cache_version:' . $tag,
                (string) Str::uuid()
            );
        }
    }
}
