import { 
  buildNumeroPermis, 
  buildNumeroOriginePermis,
  extractCategorieFromNumeroPermis 
} from '../forms/utils';
import { NumeroPermisParts, FormationData } from '../forms/types';
import { Formation } from '../services';

export const getPermisCategorie = (
  isNouveauPermis: boolean,
  permisData: { numero_permis: string },
  numeroPermis: string,
  numeroPermisParts: NumeroPermisParts,
  permisFormat: 'standard' | 'op'
): string => {
  if (isNouveauPermis) return '';
  
  const numPermisComplet = permisData.numero_permis || numeroPermis || buildNumeroPermis(numeroPermisParts, permisFormat);
  if (!numPermisComplet) return '';
  
  if (numPermisComplet.toUpperCase().startsWith('PERM')) return '';
  
  const categorie = numeroPermisParts.categorie?.toUpperCase() || extractCategorieFromNumeroPermis(numPermisComplet);
  return categorie || '';
};

export const needsPermisOrigine = (
  isNouveauPermis: boolean,
  isFicheEnregistre: boolean,
  permisData: { numero_permis: string },
  numeroPermis: string,
  numeroPermisParts: NumeroPermisParts,
  permisFormat: 'standard' | 'op'
): boolean => {
  if (isNouveauPermis) return false;
  if (isFicheEnregistre) return false;
  
  const categorie = getPermisCategorie(isNouveauPermis, permisData, numeroPermis, numeroPermisParts, permisFormat);
  return Boolean(categorie && ['C', 'D', 'E'].includes(categorie));
};

export const isFormationTypeC = (
  isNouveauPermis: boolean,
  formationData: FormationData,
  formations: Formation[]
): boolean => {
  if (!isNouveauPermis || !formationData.formation_id) return false;
  if (!formations || formations.length === 0) return false;
  
  const selectedFormation = formations.find(f => f.id === formationData.formation_id);
  if (!selectedFormation) return false;
  
  // Vérifier type_permis (snake_case)
  if (selectedFormation.type_permis) {
    const typePermis = selectedFormation.type_permis as any;
    if (typePermis.libelle) {
      const libelle = typePermis.libelle.toUpperCase();
      return libelle.includes('PERMIS C') || libelle === 'C';
    }
    if (typePermis.code) {
      const code = typePermis.code.toUpperCase();
      return code.includes('PERMIS_C') || code === 'PERMIS_C' || code === 'C';
    }
    if (typePermis.nom) {
      const nom = typePermis.nom.toUpperCase();
      return nom.includes('PERMIS C') || nom === 'C';
    }
  }
  
  // Vérifier typePermis (camelCase)
  if (selectedFormation.typePermis) {
    const typePermis = selectedFormation.typePermis as any;
    if (typePermis.libelle) {
      const libelle = typePermis.libelle.toUpperCase();
      return libelle.includes('PERMIS C') || libelle === 'C';
    }
    if (typePermis.code) {
      const code = typePermis.code.toUpperCase();
      return code.includes('PERMIS_C') || code === 'PERMIS_C' || code === 'C';
    }
    if (typePermis.nom) {
      const nom = typePermis.nom.toUpperCase();
      return nom.includes('PERMIS C') || nom === 'C';
    }
  }
  
  return false;
};

