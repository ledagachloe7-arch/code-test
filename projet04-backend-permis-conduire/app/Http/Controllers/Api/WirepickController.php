<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WirepickService;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;

#[Group('Wirepick', description: 'Envoi de SMS et notifications via Wirepick. Envoi SMS normal et autres actions.')]
class WirepickController extends Controller
{
    protected $wirepick;

    public function __construct(WirepickService $wirepick)
    {
        $this->wirepick = $wirepick;
    }

    /** Envoi d\'un SMS. Body : phone (requis), message (requis). */
    public function sendSMS(Request $request)
    {
        $request->validate([
            'phone'   => 'required',
            'message' => 'required'
        ]);

        $response = $this->wirepick->sendSMS(
            $request->phone,
            $request->message,
            $request->from
        );

        return response()->json(['response' => $response]);
    }

    // Envoi de SMS Flash
    public function sendFlash(Request $request)
    {
        $request->validate([
            'phone'   => 'required',
            'message' => 'required'
        ]);

        $response = $this->wirepick->sendSMS(
            $request->phone,
            $request->message,
            $request->from,
            true // Flash = Yes
        );

        return response()->json(['response' => $response]);
    }

    // Vérification du statut du message
    public function query(Request $request)
    {
        $request->validate([
            'msgid' => 'required'
        ]);

        $response = $this->wirepick->queryMessage($request->msgid);

        return response()->json(['response' => $response]);
    }
}
