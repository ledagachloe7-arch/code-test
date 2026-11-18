<?php

/*
| Duplicata du permis rose (cadrage v1.0 du 17/11/2026).
| Les points « à valider avec le métier » sont paramétrables ici.
*/
return [
    // Type de demande en base (distinct de DUPLICATAFICHEENREGISTREMENT).
    'type_demande' => 'DUPLICATA',

    // Statut initial du dossier créé (aligné sur le parcours « Nouvelle demande »).
    'statut_initial' => 'en_attente',

    // Motifs autorisés (à valider) et ceux pour lesquels un justificatif est obligatoire (à valider).
    'motifs' => [
        'PERTE' => 'Perte',
        'VOL' => 'Vol',
        'DETERIORATION' => 'Détérioration / document illisible',
        'AUTRE' => 'Autre',
    ],
    'motifs_justificatif_obligatoire' => array_filter(array_map('trim', explode(',', env('DUPLICATA_MOTIFS_JUSTIFICATIF_OBLIGATOIRE', '')))),

    // Anti-doublon : une demande est « en cours » tant que son dossier n'a pas l'un de ces statuts (à valider).
    'statuts_dossier_clos' => array_filter(array_map('trim', explode(',', env(
        'DUPLICATA_STATUTS_CLOS',
        'DOSSIER ENVOYER,valide,rejete,annule'
    )))),

    'observations_max' => 1000,
    'disk' => env('DUPLICATA_DISK', 'local'),
    'justificatif_max_ko' => 5120,
    'justificatif_types' => ['pdf', 'jpg', 'jpeg', 'png'],
];
