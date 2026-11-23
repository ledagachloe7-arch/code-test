<?php

namespace App\Support;

use App\Models\HPermis;
use Illuminate\Database\Eloquent\Builder;

/**
 * Support d'un permis du registre h_permis :
 * - ROSE : permis de conduire national ;
 * - VERT : fiche d'enregistrement (type_permis = FICHE_ENREGISTREMENT ou DUPLICATA FE, quelle que soit l'écriture).
 *
 * Les circuits Renouvellement, Mise à jour et Duplicata sont communs aux deux supports :
 * un titulaire est toujours traité support par support (ses lignes roses d'un côté, ses fiches de l'autre).
 */
final class SupportPermis
{
    public const ROSE = 'ROSE';
    public const VERT = 'VERT';

    public const TOUS = [self::ROSE, self::VERT];

    /**
     * Valeurs de type_permis (normalisées : majuscules, sans espaces ni ponctuation) qui désignent une fiche d'enregistrement :
     * FICHE_ENREGISTREMENT et DUPLICATA FE (fiche avec numéro et lieu du permis d'origine).
     */
    public const TYPES_FICHE = ['FICHEENREGISTREMENT', 'DUPLICATAFE'];

    /** Expression SQL du type_permis normalisé (même règle que estFiche()). */
    private const SQL_TYPE = "upper(regexp_replace(coalesce(type_permis, ''), '[^A-Za-z0-9]', '', 'g'))";

    public static function estFiche(?string $typePermis): bool
    {
        return in_array(strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $typePermis)), self::TYPES_FICHE, true);
    }

    public static function de(HPermis $p): string
    {
        return self::estFiche($p->type_permis) ? self::VERT : self::ROSE;
    }

    /** Normalise une valeur reçue (rose, VERT…) ; null si absente ou inconnue. */
    public static function normaliser(?string $support): ?string
    {
        $s = strtoupper(trim((string) $support));
        return in_array($s, self::TOUS, true) ? $s : null;
    }

    /** Restreint une requête h_permis (ou son alias) aux lignes d'un support. */
    public static function filtrer(Builder $query, string $support, string $prefixe = ''): Builder
    {
        $expr = $prefixe === '' ? self::SQL_TYPE : str_replace('type_permis', $prefixe . '.type_permis', self::SQL_TYPE);
        $marques = implode(', ', array_fill(0, count(self::TYPES_FICHE), '?'));
        return $support === self::VERT
            ? $query->whereRaw("{$expr} in ({$marques})", self::TYPES_FICHE)
            : $query->whereRaw("{$expr} not in ({$marques})", self::TYPES_FICHE);
    }

    public static function libelle(string $support): string
    {
        return $support === self::VERT ? "fiche d'enregistrement (permis vert)" : 'permis rose';
    }

    /** Message d'erreur quand un permis est ouvert dans le circuit de l'autre support. */
    public static function messageMauvaisCircuit(?string $numeroPermis, string $support): string
    {
        $nature = $support === self::VERT ? "une fiche d'enregistrement (permis vert)" : 'un permis rose';
        $circuit = $support === self::VERT ? 'Permis vert' : 'Permis rose';
        return ($numeroPermis ? "Le permis {$numeroPermis}" : 'Ce permis') . " est {$nature} : utilisez le circuit {$circuit}.";
    }
}
