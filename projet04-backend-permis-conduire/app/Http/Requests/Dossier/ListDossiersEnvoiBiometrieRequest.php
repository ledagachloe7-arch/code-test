<?php

namespace App\Http\Requests\Dossier;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator as IlluminateValidator;

/**
 * Query pour `GET /api/dossiers/envoi-biometrie` : dossiers en suivi remise carte (statut exact `Dossier::STATUT_DOSSIER_ENVOYER`, carte disponible, remise), pagination et filtre dates sur `updated_at`.
 */
class ListDossiersEnvoiBiometrieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'date_from' => ['nullable', 'string', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'string', 'date_format:Y-m-d'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (IlluminateValidator $v): void {
            $d = $v->getData();
            $from = isset($d['date_from']) && is_string($d['date_from']) ? $d['date_from'] : null;
            $to = isset($d['date_to']) && is_string($d['date_to']) ? $d['date_to'] : null;
            if ($from !== null && $from !== '' && $to !== null && $to !== '' && $from > $to) {
                $v->errors()->add('date_to', 'date_to doit être supérieur ou égal à date_from.');
            }
        });
    }
}
