<?php

return [
    /*
    | Frais de renouvellement PAR CATÉGORIE (XAF). Montant total = nb catégories renouvelées × ce montant.
    | À confirmer par l'administration.
    */
    'montant' => (float) env('RENOUVELLEMENT_MONTANT', 0),

    /*
    | Frais par catégorie pour la fiche d'enregistrement (permis vert). Vide = même montant que le permis rose.
    | À confirmer par l'administration. Les durées de validité ci-dessous s'appliquent aux deux supports.
    */
    'montant_vert' => env('RENOUVELLEMENT_MONTANT_FICHE'),
    'devise' => env('RENOUVELLEMENT_DEVISE', 'XAF'),

    /*
    | Durées de validité par catégorie (en années).
    | Mêmes périodicités pour la première délivrance et les renouvellements.
    | Pour C et D : 'standard' avant l'âge seuil, 'senior' à partir de l'âge seuil
    | (âge calculé à la date effective du renouvellement).
    */
    'durees' => [
        'A1' => 10,
        'A' => 10,
        'B' => 10,
        'C' => ['standard' => 5, 'senior' => 1],
        'D' => ['standard' => 5, 'senior' => 1],
        'E' => 10,
        'F' => 10,
    ],
    'age_seuil_senior' => 60,
];
