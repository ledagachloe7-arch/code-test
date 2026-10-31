export interface Circuit { 
    'id': string,
    'libelle': string,
    'actif': boolean,
    'nom_entite': string,
    'description'?: string,
    'type_permis'?: string,
    'etranger'?: string,
    'nationalite'?: string
    // 'entite_cle_nom': string, 
}

export interface CircuitFormData { 
    'nom': string,
    'actif': boolean,
    'nom_entite': string,
    'description'?: string,
    'type_permis'?: string,
    'etranger'?: string,
    'nationalite'?: string
    // 'entite_cle_nom': string, 
}