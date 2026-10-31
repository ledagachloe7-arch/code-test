<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WirepickService
{
    protected $baseUrl;
    protected $client;
    protected $password;

    public function __construct()
    {
        $this->baseUrl = config('services.wirepick.base_url');
        $this->client = config('services.wirepick.client');
        $this->password = config('services.wirepick.password');
    }

    public function sendSMS($phone, $message, $from = null, $flash = false, $scheduleTime = null)
    {
        // Assurer que le texte est en UTF-8
        $utf8Message = mb_convert_encoding($message, 'UTF-8', 'auto');
        $params = [
            'client' => $this->client,
            'password' => $this->password,
            'phone' => $phone,
            'text' => "bonjour comment ca va ?",
        ];

        if ($from)
            $params['from'] = $from;
        if ($flash)
            $params['Flash'] = 'Yes';
        if ($scheduleTime)
            $params['scheduletime'] = $scheduleTime;

        $url = $this->baseUrl . '/send';

        return Http::get($url, $params)->body();
    }

    public function queryMessage($msgId)
    {
        $params = [
            'client' => $this->client,
            'password' => $this->password,
            'msgid' => $msgId
        ];

        $url = $this->baseUrl . '/querymsg';

        return Http::get($url, $params)->body();
    }
}
