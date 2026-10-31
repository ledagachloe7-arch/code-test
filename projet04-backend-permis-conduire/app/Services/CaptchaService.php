<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CaptchaService
{
    public function generateCaptcha(): array
    {
        $length = (int) config('captcha.length', 6);
        $code = $this->generateCode($length);
        $captchaId = (string) Str::uuid();

        Cache::put(
            $this->cacheKey($captchaId),
            $this->hashCode($code),
            now()->addSeconds((int) config('captcha.ttl', 180))
        );

        return [
            'captcha_id' => $captchaId,
            'image' => $this->generateImage($code),
        ];
    }

    public function validateCaptcha(?string $captchaId, ?string $code): bool
    {
        if (empty($captchaId) || empty($code)) {
            return false;
        }

        $stored = Cache::get($this->cacheKey($captchaId));

        if (!$stored) {
            return false;
        }

        $isValid = hash_equals($stored, $this->hashCode($code));

        if ($isValid) {
            Cache::forget($this->cacheKey($captchaId));
        }

        return $isValid;
    }

    private function cacheKey(string $captchaId): string
    {
        return "captcha:$captchaId";
    }

    private function generateCode(int $length): string
    {
        $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $result = '';

        for ($i = 0; $i < $length; $i++) {
            $result .= $characters[random_int(0, strlen($characters) - 1)];
        }

        return $result;
    }

    private function hashCode(string $code): string
    {
        return hash('sha256', strtoupper($code));
    }

    private function generateImage(string $code): string
    {
        $width = (int) config('captcha.width', 160);
        $height = (int) config('captcha.height', 60);

        $image = imagecreatetruecolor($width, $height);
        
        // FORCER un fond blanc/gris très clair (RGB direct pour être sûr)
        $backgroundColor = imagecolorallocate($image, 245, 245, 245); // Gris clair #f5f5f5
        
        // Si l'allocation échoue, essayer blanc pur
        if ($backgroundColor === false || $backgroundColor === -1) {
            $backgroundColor = imagecolorallocate($image, 255, 255, 255); // Blanc pur
        }
        
        // Remplir le fond
        imagefill($image, 0, 0, $backgroundColor);
        
        // Ajouter le bruit AVANT le texte
        $this->addNoise($image, $width, $height);
        
        // FORCER une couleur noire pure pour le texte (RGB direct)
        $textColor = imagecolorallocate($image, 0, 0, 0); // Noir pur (0,0,0)
        
        // Si l'allocation échoue, essayer gris très foncé
        if ($textColor === false || $textColor === -1) {
            $textColor = imagecolorallocate($image, 20, 20, 20); // Gris très foncé
        }
        
        // Vérification finale - si toujours invalide, créer une nouvelle image
        if ($textColor === false || $textColor === -1) {
            // Dernière tentative avec une couleur différente
            $textColor = imagecolorallocate($image, 50, 50, 50);
        }

        $fontFile = resource_path('fonts/DejaVuSans.ttf');
        $codeLength = strlen($code);
        
        // Calculer la taille de la police et la position pour centrer le texte
        $fontSize = (int) ($height * 0.55); // 55% de la hauteur pour plus de visibilité
        $charWidth = $width / ($codeLength + 1); // Espacement entre caractères
        
        if (function_exists('imagettftext') && file_exists($fontFile)) {
            // Dessiner chaque caractère individuellement pour un meilleur contrôle
            for ($i = 0; $i < $codeLength; $i++) {
                $char = $code[$i];
                $x = (int) ($charWidth * ($i + 0.5) + 10);
                $y = (int) ($height * 0.75); // Position verticale ajustée
                $angle = random_int(-10, 10); // Légère rotation
                
                // Dessiner le caractère
                $result = imagettftext(
                    $image,
                    $fontSize,
                    $angle,
                    $x,
                    $y,
                    $textColor,
                    $fontFile,
                    $char
                );
            }
        } else {
            // Fallback sans police TTF - utiliser imagestring avec une taille plus grande
            $x = (int) (($width - $codeLength * 12) / 2); // Centrer
            $y = (int) (($height - 20) / 2); // Centrer verticalement
            imagestring($image, 5, $x, $y, $code, $textColor);
        }

        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    private function allocateColor($image, string $hex)
    {
        // Nettoyer la chaîne hex
        $hex = ltrim($hex, '#');
        
        // S'assurer que c'est bien 6 caractères
        if (strlen($hex) !== 6) {
            // Couleur par défaut noire si le format est incorrect (pour le texte)
            // Vérifier si c'est pour le background ou le texte
            $defaultColor = (strpos($hex, 'f5f5f5') !== false || strpos($hex, 'ffffff') !== false) 
                ? imagecolorallocate($image, 245, 245, 245) // Gris clair pour background
                : imagecolorallocate($image, 26, 26, 26); // Noir pour texte
            return $defaultColor;
        }
        
        // Convertir hex en RGB
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        // Allouer la couleur
        $color = imagecolorallocate($image, $r, $g, $b);
        
        // Si l'allocation échoue, retourner une couleur par défaut selon le contexte
        if ($color === false || $color === -1) {
            // Si c'est une couleur claire (background), retourner gris clair
            if ($r > 200 && $g > 200 && $b > 200) {
                return imagecolorallocate($image, 245, 245, 245);
            }
            // Sinon, retourner noir (pour le texte)
            return imagecolorallocate($image, 26, 26, 26);
        }
        
        return $color;
    }

    private function addNoise($image, int $width, int $height): void
    {
        $noiseAmount = (int) config('captcha.noise', 30);
        // Bruit en gris moyen pour être visible sur fond clair (comme dans l'image)
        $noiseColor = imagecolorallocate($image, 200, 200, 200);
        
        // S'assurer que la couleur de bruit est valide
        if ($noiseColor === false || $noiseColor === -1) {
            $noiseColor = imagecolorallocate($image, 200, 200, 200);
        }

        for ($i = 0; $i < $noiseAmount; $i++) {
            imageline(
                $image,
                random_int(0, $width),
                random_int(0, $height),
                random_int(0, $width),
                random_int(0, $height),
                $noiseColor
            );
        }
    }
}

