<?php

/*
| Module « Mise à jour des informations personnelles » (cahier des charges §4-7).
| Les points marqués « à confirmer » par l'administration sont paramétrables ici.
*/
return [
    // Rôles autorisés à approuver / rejeter une demande (à confirmer).
    'roles_validateurs' => array_filter(array_map('trim', explode(',', env('MODIFICATIONS_ROLES_VALIDATEURS', 'ROLE_ADMIN,ROLE_CNEPC')))),

    // Validation renforcée de la date de naissance : rôles autorisés (à confirmer).
    'roles_validateurs_date_naissance' => array_filter(array_map('trim', explode(',', env('MODIFICATIONS_ROLES_VALIDATEURS_DATE_NAISSANCE', 'ROLE_ADMIN')))),

    // Rôles qui ne peuvent pas initier de demande (usagers).
    'roles_exclus' => ['ROLE_CANDIDAT', 'candidat'],

    // Stockage privé des justificatifs (accessibles uniquement via l'API, profils autorisés).
    'disk' => env('MODIFICATIONS_DISK', 'local'),
    'justificatif_max_ko' => 5120,
    'justificatif_types' => ['pdf', 'jpg', 'jpeg', 'png'],

    // Champs modifiables et libellés.
    'champs' => [
        'nom' => 'Nom',
        'prenom' => 'Prénom',
        'date_naissance' => 'Date de naissance',
        'lieu_naissance' => 'Lieu de naissance',
        'nationalite' => 'Nationalité',
    ],
];
