<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Recherche paginée sur la table `h_permis` (sous-chaînes, insensible à la casse).
 *
 * Contrat : au moins un des champs `nom`, `prenom`, `date_naissance`, `numero_permis` doit être non vide.
 * Utilisé par `GET` et `POST` `/api/h-permis/recherche` (query string ou corps JSON `application/json`).
 */
class SearchHPermisLikeRequest extends FormRequest
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
            'nom' => 'nullable|string|max:200',
            'prenom' => 'nullable|string|max:200',
            'date_naissance' => 'nullable|string|max:50',
            'numero_permis' => 'nullable|string|max:200',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $d = $this->only(['nom', 'prenom', 'date_naissance', 'numero_permis']);
            $hasNonEmpty = false;
            foreach (['nom', 'prenom', 'date_naissance', 'numero_permis'] as $key) {
                $val = $d[$key] ?? null;
                if ($val === null) {
                    continue;
                }
                if (trim((string) $val) !== '') {
                    $hasNonEmpty = true;
                    break;
                }
            }
            if (!$hasNonEmpty) {
                $v->errors()->add(
                    'critères',
                    'Au moins un paramètre parmi nom, prenom, date_naissance, numero_permis doit être envoyé avec une valeur non vide (recherche sans filtre non autorisée).'
                );
            }
        });
    }
}
