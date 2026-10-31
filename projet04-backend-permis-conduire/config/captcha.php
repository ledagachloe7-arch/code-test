<?php

return [
    'length' => env('CAPTCHA_LENGTH', 6),
    'width' => env('CAPTCHA_WIDTH', 160),
    'height' => env('CAPTCHA_HEIGHT', 60),
    'ttl' => env('CAPTCHA_TTL', 180), // seconds (3 minutes)
    'background' => env('CAPTCHA_BACKGROUND', '#f5f5f5'), // Gris clair (comme l'image)
    'text_color' => env('CAPTCHA_TEXT_COLOR', '#1a1a1a'), // Noir/gris très foncé (comme l'image)
    'noise' => env('CAPTCHA_NOISE', 30),
];

