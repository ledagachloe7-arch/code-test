export interface Referentiel {
  id:number;
  libelle: string;      // ex: "Permis B"
  code: string;         // ex: "PERMIS_B"
  type_ref: string;     // ex: "type_permis"
  description?: string; // optionnel (ou "string" si tu veux forcer)
  statut: boolean;      // true = actif, false = inactif
}
export interface ReferentielFormulaire {
 
  libelle: string;      // ex: "Permis B"
  code: string;         // ex: "PERMIS_B"
  type_ref: string;     // ex: "type_permis"
  description?: string; // optionnel (ou "string" si tu veux forcer)
  statut: boolean;      // true = actif, false = inactif
}