<?php

/**
 * Guichet usager : tarifs des actions payées dans le paiement groupé.
 * Les montants sont à fixer par l'administration (valeurs vides = action non facturable → refusée dans une commande).
 * Le montant du renouvellement vient de config/renouvellement.php (par catégorie expirée).
 */
return [
    'montant_digitalisation' => env('DIGITALISATION_MONTANT'),
    'montant_mise_a_jour' => env('MISE_A_JOUR_MONTANT'),
    'devise' => env('GUICHET_DEVISE', env('RENOUVELLEMENT_DEVISE', 'XAF')),
];
