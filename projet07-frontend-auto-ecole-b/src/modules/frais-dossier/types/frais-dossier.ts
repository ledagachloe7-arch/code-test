export interface FraisDossier {
  id: string;
  /** Libellé ou montant affiché (ex. "15 000 FCFA" ou "Frais de dossier standard") */
  fraisDeDossier: string;
  typePermis: string;
  typeDemande: string;
  actif: boolean;
}
