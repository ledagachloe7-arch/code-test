<?php

namespace App\Services;

use App\Models\Dossier;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service d'intégration Moov Money Gabon - Paiement en ligne marchand (InitTrans_OnlineMerchantPayment).
 * Envoie une requête SOAP pour déclencher le push de débit sur le téléphone du client.
 */
class PaiementMoovService
{
    protected string $baseUrl;
    protected string $thirdPartyId;
    protected string $password;
    protected string $resultUrl;
    protected string $initiatorIdentifier;
    protected string $securityCredential;
    protected string $channelCode;
    protected string $merchantShortcode;
    protected string $requesterIdentifier;
    protected string $keyOwner;
    protected string $callerType;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.moov_money.base_url'), '/');
        $this->thirdPartyId = (string) config('services.moov_money.third_party_id');
        $this->password = (string) config('services.moov_money.password');
        $this->resultUrl = (string) config('services.moov_money.result_url');
        $this->initiatorIdentifier = (string) config('services.moov_money.initiator_identifier');
        $this->securityCredential = (string) config('services.moov_money.security_credential');
        $this->channelCode = (string) config('services.moov_money.channel_code');
        $this->merchantShortcode = (string) config('services.moov_money.merchant_shortcode');
        $this->requesterIdentifier = (string) config('services.moov_money.requester_identifier');
        $this->keyOwner = (string) config('services.moov_money.key_owner');
        $this->callerType = (string) config('services.moov_money.caller_type');
    }

    /**
     * Normalise le numéro de téléphone au format MSISDN Gabon (241...).
     */
    public static function normalizePhone(string $contact): string
    {
        $digits = preg_replace('/\D/', '', $contact);
        if (str_starts_with($digits, '241') && strlen($digits) >= 12) {
            return $digits;
        }
        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        return '241' . $digits;
    }

    /**
     * Construit le corps SOAP pour InitTrans_OnlineMerchantPayment.
     *
     * @param string $originatorConversationID Référence unique (ex: P_{dossier_id})
     * @param string $subscriberMsisdn Numéro client (241...)
     * @param string $amount Montant (ex: 150.00)
     * @param string $currency Devise (ex: XAF)
     * @param string $externalData1 Donnée métier 1 (ex: dossier_id)
     * @param string $externalData2 Donnée métier 2 (ex: code_paiement)
     */
    public function buildInitTransOnlineMerchantPaymentXml(
        string $originatorConversationID,
        string $subscriberMsisdn,
        string $amount,
        string $currency = 'XAF',
        string $externalData1 = '',
        string $externalData2 = ''
    ): string {
        $timestamp = now()->format('YmdHis');
        $subscriberMsisdn = self::normalizePhone($subscriberMsisdn);

        $xml = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://cps.huawei.com/cpsinterface/api_requestmgr" xmlns:req="http://cps.huawei.com/cpsinterface/request" xmlns:com="http://cps.huawei.com/cpsinterface/common">
   <soapenv:Header/>
   <soapenv:Body>
      <api:Request>
         <req:Header>
            <req:Version>1.0</req:Version>
            <req:CommandID>InitTrans_OnlineMerchantPayment</req:CommandID>
            <req:OriginatorConversationID>{$originatorConversationID}</req:OriginatorConversationID>
            <req:Caller>
               <req:CallerType>{$this->callerType}</req:CallerType>
               <req:ThirdPartyID>{$this->thirdPartyId}</req:ThirdPartyID>
               <req:Password>{$this->password}</req:Password>
               <req:ResultURL>{$this->resultUrl}</req:ResultURL>
            </req:Caller>
            <req:KeyOwner>{$this->keyOwner}</req:KeyOwner>
            <req:Timestamp>{$timestamp}</req:Timestamp>
            <req:ChannelCode>{$this->channelCode}</req:ChannelCode>
         </req:Header>
         <req:Body>
            <req:Identity>
               <req:Initiator>
                  <req:IdentifierType>14</req:IdentifierType>
                  <req:Identifier>{$this->initiatorIdentifier}</req:Identifier>
                  <req:SecurityCredential>{$this->securityCredential}</req:SecurityCredential>
               </req:Initiator>
               <req:PrimaryParty>
                  <req:IdentifierType>1</req:IdentifierType>
                  <req:Identifier>{$subscriberMsisdn}</req:Identifier>
               </req:PrimaryParty>
               <req:ReceiverParty>
                  <req:IdentifierType>4</req:IdentifierType>
                  <req:Identifier>{$this->merchantShortcode}</req:Identifier>
               </req:ReceiverParty>
               <req:Requester>
                  <req:IdentifierType>4</req:IdentifierType>
                  <req:Identifier>{$this->requesterIdentifier}</req:Identifier>
               </req:Requester>
            </req:Identity>
            <req:TransactionRequest>
               <req:Parameters>
                  <req:Parameter>
                     <com:Key>ChargePayer</com:Key>
                     <com:Value>Subscriber</com:Value>
                  </req:Parameter>
                  <req:Amount>{$amount}</req:Amount>
                  <req:Currency>{$currency}</req:Currency>
               </req:Parameters>
            </req:TransactionRequest>
            <req:ReferenceData>
               <req:ReferenceItem>
                  <com:Key>externalData1</com:Key>
                  <com:Value>{$externalData1}</com:Value>
               </req:ReferenceItem>
               <req:ReferenceItem>
                  <com:Key>externalData2</com:Key>
                  <com:Value>{$externalData2}</com:Value>
               </req:ReferenceItem>
            </req:ReferenceData>
         </req:Body>
      </api:Request>
   </soapenv:Body>
</soapenv:Envelope>
XML;

        return $xml;
    }

    /**
     * Initie un paiement Moov (déclenche le push sur le téléphone du client).
     * Le numéro est fourni par l'appelant (envoyé par l'API cliente), on ne prend plus personne.contact.
     *
     * @param string $numero Numéro du client (envoyé par l'API, ex. 241... ou 0...)
     * @return array{success: bool, message: string, response_code?: string, response_desc?: string, conversation_id?: string, raw?: string}
     */
    public function initierPaiement(Dossier $dossier, string $numero, ?float $montant = null, string $currency = 'XAF'): array
    {
        if (empty($this->baseUrl) || empty($this->password) || empty($this->resultUrl)) {
            Log::warning('[MoovPayment] Configuration manquante (base_url, password ou result_url)');
            return [
                'success' => false,
                'message' => 'Configuration Moov Money incomplète.',
            ];
        }

        $contact = trim((string) $numero);
        if ($contact === '') {
            return [
                'success' => false,
                'message' => 'Le numéro de téléphone est obligatoire.',
            ];
        }

        $dossier->load(['formation']);

        if ($montant === null && $dossier->formation) {
            $montant = (float) $dossier->formation->montant;
        }
        if ($montant === null || $montant <= 0) {
            return [
                'success' => false,
                'message' => 'Montant invalide ou absent (formation sans montant).',
            ];
        }

        $originatorConversationID = 'P_' . $dossier->id;
        $amountStr = number_format($montant, 2, '.', '');
        $externalData1 = (string) $dossier->id;
        $externalData2 = (string) ($dossier->code_paiement ?? '');

        $xml = $this->buildInitTransOnlineMerchantPaymentXml(
            $originatorConversationID,
            $contact,
            $amountStr,
            $currency,
            $externalData1,
            $externalData2
        );

        try {
            $response = Http::timeout(25)
                ->withHeaders([
                    'Content-Type' => 'text/xml; charset=utf-8',
                    'SOAPAction' => '',
                ])
                ->withBody($xml, 'text/xml')
                ->post($this->baseUrl);

            $raw = $response->body();
            Log::info('[MoovPayment] InitTrans_OnlineMerchantPayment response', [
                'dossier_id' => $dossier->id,
                'status' => $response->status(),
                'body_length' => strlen($raw),
            ]);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'message' => 'Erreur HTTP Moov: ' . $response->status(),
                    'raw' => $raw,
                ];
            }

            $responseCode = $this->extractXmlValue($raw, 'ResponseCode', 'http://cps.huawei.com/cpsinterface/response');
            $responseDesc = $this->extractXmlValue($raw, 'ResponseDesc', 'http://cps.huawei.com/cpsinterface/response');
            $conversationId = $this->extractXmlValue($raw, 'ConversationID', 'http://cps.huawei.com/cpsinterface/response');
            if (empty($responseCode) && empty($conversationId)) {
                $responseCode = $this->extractXmlValue($raw, 'res:ResponseCode');
                $responseDesc = $this->extractXmlValue($raw, 'res:ResponseDesc');
                $conversationId = $this->extractXmlValue($raw, 'res:ConversationID');
            }

            $success = ($responseCode === '0' || $responseCode === '');
            return [
                'success' => $success,
                'message' => $responseDesc ?: ($success ? 'Requête acceptée par Moov. Le client reçoit le push sur son téléphone.' : 'Erreur Moov'),
                'response_code' => $responseCode,
                'response_desc' => $responseDesc,
                'conversation_id' => $conversationId,
                'originator_conversation_id' => $originatorConversationID,
                'raw' => $raw,
            ];
        } catch (\Throwable $e) {
            Log::error('[MoovPayment] Exception', ['dossier_id' => $dossier->id, 'error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'Erreur de connexion au service Moov: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Extrait une valeur d'un tag XML (namespace ou préfixe).
     */
    private function extractXmlValue(string $xml, string $tagName, ?string $ns = null): string
    {
        if ($ns) {
            $pattern = '/<([^:>]+:)?' . preg_quote($tagName, '/') . '[^>]*>([^<]*)<\//';
        } else {
            $pattern = '/<' . preg_quote($tagName, '/') . '[^>]*>([^<]*)<\//';
        }
        if (preg_match($pattern, $xml, $m)) {
            return trim($m[2] ?? '');
        }
        $pattern2 = '/<[^>]+:' . preg_quote($tagName, '/') . '[^>]*>([^<]*)<\//';
        if (preg_match($pattern2, $xml, $m)) {
            return trim($m[1] ?? '');
        }
        return '';
    }

    /**
     * Parse le Result SOAP envoyé par Moov sur la ResultURL (callback).
     *
     * @return array{result_type?: string, result_code?: string, result_desc?: string, transaction_id?: string, originator_conversation_id?: string, conversation_id?: string}
     */
    public function parseResultXml(string $xmlBody): array
    {
        $out = [];
        $out['result_type'] = $this->extractXmlValue($xmlBody, 'ResultType') ?: $this->extractXmlValue($xmlBody, 'res:ResultType');
        $out['result_code'] = $this->extractXmlValue($xmlBody, 'ResultCode') ?: $this->extractXmlValue($xmlBody, 'res:ResultCode');
        $out['result_desc'] = $this->extractXmlValue($xmlBody, 'ResultDesc') ?: $this->extractXmlValue($xmlBody, 'res:ResultDesc');
        $out['transaction_id'] = $this->extractXmlValue($xmlBody, 'TransactionID') ?: $this->extractXmlValue($xmlBody, 'res:TransactionID');
        $out['originator_conversation_id'] = $this->extractXmlValue($xmlBody, 'OriginatorConversationID') ?: $this->extractXmlValue($xmlBody, 'res:OriginatorConversationID');
        $out['conversation_id'] = $this->extractXmlValue($xmlBody, 'ConversationID') ?: $this->extractXmlValue($xmlBody, 'res:ConversationID');
        return $out;
    }
}
