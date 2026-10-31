<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GenerateVapidKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'webpush:vapid';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Générer les clés VAPID pour les notifications push';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Génération des clés VAPID...');

        try {
            // Vérifier que OpenSSL est disponible
            if (!extension_loaded('openssl')) {
                throw new \Exception('Extension OpenSSL non disponible. Installez l\'extension OpenSSL pour PHP.');
            }

            // Générer une paire de clés EC (Elliptic Curve) pour VAPID
            $config = [
                'private_key_type' => OPENSSL_KEYTYPE_EC,
                'curve_name' => 'prime256v1',
            ];

            $resource = openssl_pkey_new($config);
            if (!$resource) {
                $error = openssl_error_string();
                throw new \Exception('Impossible de générer les clés : ' . ($error ?: 'Erreur OpenSSL inconnue'));
            }

            // Extraire la clé privée au format PEM
            openssl_pkey_export($resource, $privateKeyPem);
            
            // Extraire les détails de la clé publique
            $details = openssl_pkey_get_details($resource);
            $publicKeyPem = $details['key'];

            // Extraire les clés au format DER pour VAPID
            // La clé publique VAPID est la partie après le header du point EC
            $publicKeyDer = $this->extractPublicKeyFromPem($publicKeyPem);
            $privateKeyDer = $this->extractPrivateKeyFromPem($privateKeyPem);

            // Convertir en base64url (format VAPID)
            $publicKey = $this->base64UrlEncode($publicKeyDer);
            $privateKey = $this->base64UrlEncode($privateKeyDer);

            $this->newLine();
            $this->info('✅ Clés VAPID générées avec succès !');
            $this->newLine();
            
            $this->line('Ajoutez ces lignes à votre fichier .env :');
            $this->newLine();
            
            $this->line('VAPID_PUBLIC_KEY=' . $publicKey);
            $this->line('VAPID_PRIVATE_KEY=' . $privateKey);
            $this->newLine();
            
            $this->warn('⚠️  IMPORTANT : Ne partagez jamais votre clé privée !');
            $this->warn('⚠️  Ces clés sont nécessaires pour envoyer des notifications push.');

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Erreur lors de la génération des clés VAPID : ' . $e->getMessage());
            $this->newLine();
            $this->line('💡 Alternative : Utilisez un générateur en ligne :');
            $this->line('   https://web-push-codelab.glitch.me/');
            $this->newLine();
            $this->line('   Ou avec Node.js :');
            $this->line('   npx web-push generate-vapid-keys');
            return Command::FAILURE;
        }
    }

    /**
     * Extraire la clé publique du format PEM
     */
    protected function extractPublicKeyFromPem(string $pem): string
    {
        // Supprimer les en-têtes PEM
        $pem = preg_replace('/-----BEGIN PUBLIC KEY-----/', '', $pem);
        $pem = preg_replace('/-----END PUBLIC KEY-----/', '', $pem);
        $pem = preg_replace('/\s+/', '', $pem);
        
        // Décoder base64
        $der = base64_decode($pem);
        
        // Pour VAPID, on a besoin de la partie spécifique (point EC)
        // Extraire les 65 octets du point (0x04 + 64 octets)
        if (strlen($der) >= 88) {
            // La clé publique EC est généralement aux positions 26-90
            return substr($der, 26, 65);
        }
        
        return $der;
    }

    /**
     * Extraire la clé privée du format PEM
     */
    protected function extractPrivateKeyFromPem(string $pem): string
    {
        // Supprimer les en-têtes PEM
        $pem = preg_replace('/-----BEGIN PRIVATE KEY-----/', '', $pem);
        $pem = preg_replace('/-----END PRIVATE KEY-----/', '', $pem);
        $pem = preg_replace('/\s+/', '', $pem);
        
        // Décoder base64
        return base64_decode($pem);
    }

    /**
     * Encoder en base64url (format VAPID)
     */
    protected function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
