<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Nombre d'éléments par page à partir de per_page (query ou body), borné.
     */
    protected function perPage(Request $request, int $default = 15, int $max = 100): int
    {
        $n = (int) $request->input('per_page', $default);
        if ($n < 1) {
            return $default;
        }

        return min($n, $max);
    }
}
