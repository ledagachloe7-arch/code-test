<?php

namespace App\Support;

/**
 * Normalise `data_categorie` à l’entrée API pour un stockage cohérent en JSON (tableau d’objets).
 *
 * Formes acceptées :
 * - `null` / absent (géré par l’appelant qui ne merge pas)
 * - chaîne JSON : tableau `[{...}]` ou objet unique `{...}`
 * - objet unique (tableau associatif PHP) avec au moins une clé métier → `[{...}]`
 * - liste : chaque élément tableau associatif ou chaîne JSON d’un objet
 */
final class DossierDataCategorieInput
{
    /**
     * @return list<array<string, mixed>>|null  null = laisser vide / rien à persister
     */
    public static function normalize(mixed $value): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (! is_array($decoded)) {
                return null;
            }
            $value = $decoded;
        }

        if (! is_array($value) || $value === []) {
            return null;
        }

        if (! array_is_list($value)) {
            return self::looksLikeCategoryRow($value) ? [self::scalarizeRow($value)] : null;
        }

        $out = [];
        foreach ($value as $row) {
            if (is_string($row)) {
                $decoded = json_decode($row, true);
                $row = is_array($decoded) ? $decoded : null;
            }
            if (! is_array($row)) {
                continue;
            }
            $out[] = self::scalarizeRow($row);
        }

        return $out === [] ? null : $out;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private static function scalarizeRow(array $row): array
    {
        $clean = [];
        foreach ($row as $k => $v) {
            if ($v instanceof \Stringable) {
                $clean[$k] = (string) $v;
            } elseif (is_scalar($v) || $v === null) {
                $clean[$k] = $v;
            } elseif (is_array($v)) {
                $clean[$k] = $v;
            }
        }

        return $clean;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function looksLikeCategoryRow(array $row): bool
    {
        return array_key_exists('classe', $row)
            || array_key_exists('ville', $row)
            || array_key_exists('codification_code', $row);
    }
}
