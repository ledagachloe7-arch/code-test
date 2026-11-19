<?php

/*
| Informatisation des anciens permis roses (registre Excel, ancien format « PP/AAAA /NNNNNN LETTRES »).
| Nouveau numéro : AAAA + P + C + NNNNN (ex. 19831B00001), même année et même province que l'ancien,
| numéro d'ordre unique par année + province + catégorie.
*/
return [
    // Provinces du Gabon (code de l'ancien numéro → libellé).
    'provinces' => [
        1 => 'Estuaire',
        2 => 'Haut-Ogooué',
        3 => 'Moyen-Ogooué',
        4 => 'Ngounié',
        5 => 'Nyanga',
        6 => 'Ogooué-Ivindo',
        7 => 'Ogooué-Lolo',
        8 => 'Ogooué-Maritime',
        9 => 'Woleu-Ntem',
    ],

    // Catégories acceptées (colonne « catégorie » du fichier Excel).
    'categories' => ['A1', 'A', 'B', 'C', 'D', 'E', 'F'],

    // Longueur du numéro d'ordre dans le nouveau numéro (complété par des zéros).
    'longueur_ordre' => 5,

    // Rôles autorisés à importer le fichier Excel (à confirmer).
    'roles_import' => array_filter(array_map('trim', explode(',', env('INFORMATISATION_ROLES_IMPORT', 'ROLE_ADMIN,ROLE_CNEPC')))),

    // Rôles qui ne peuvent pas informatiser (usagers).
    'roles_exclus' => ['ROLE_CANDIDAT', 'candidat'],

    // Taille maximale d'un envoi d'import (lignes par requête).
    'lignes_par_envoi' => 500,
];
