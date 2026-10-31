<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Notifications\ChannelManager;
use Dedoc\Scramble\Support\Generator\OpenApi;
use SocialiteProviders\Manager\SocialiteWasCalled;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Laravel\Socialite\Contracts\Factory as SocialiteFactory;
use SocialiteProviders\Authentik\Provider as AuthentikProvider;
use App\Broadcasting\PushChannel;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Enregistrer le provider Authentik
        Event::listen(function (SocialiteWasCalled $event) {
            $event->extendSocialite('authentik', AuthentikProvider::class);
        });

        Scramble::configure()
        ->withDocumentTransformers(function (OpenApi $openApi) {
            $openApi->secure(
                SecurityScheme::http('bearer', 'JWT')
            );
        });

        // Enregistrer le canal push pour les notifications
        $this->app->make(ChannelManager::class)->extend('push', function () {
            return new PushChannel();
        });
    }
}
