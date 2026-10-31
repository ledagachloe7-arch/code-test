export interface Statut { 
    'id': string,
    'code': string,
    'libelle': string,
    'final': boolean,
    'annulable'?: boolean,
    // 'entite_cle_nom': string, 
}

export interface StatutFormData { 
    'code': string,
    'libelle': string,
    'final': boolean,
    'annulable'?: boolean,
    // 'entite_cle_nom': string, 
}