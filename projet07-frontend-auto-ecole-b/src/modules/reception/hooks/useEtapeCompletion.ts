import { useState, useEffect, useMemo, useCallback } from 'react';
import { EtapeCircuit, CircuitSuivi } from '../services/circuit-suivi.service';

/** Compare deux libellés (trim + insensible à la casse) pour matcher ex. "COMPLETION DE DOSSIER" avec "Completion de dossier". */
const libelleMatches = (a: string | undefined, b: string | undefined): boolean =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

/** Normalise une chaîne pour comparaison (trim + lowercase, espaces et underscores unifiés). */
const normalizeForMatch = (s: string): string =>
  (s || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/_/g, '_');

/** Retourne true si le statut du dossier correspond à l'étape (statut_libelle, libelle ou code de l'étape). */
const dossierStatutMatchesEtape = (etape: EtapeCircuit, dossierStatut: string): boolean => {
  const statutNorm = normalizeForMatch(dossierStatut);
  if (!statutNorm) return false;
  return (
    libelleMatches(etape.statut_libelle, dossierStatut) ||
    libelleMatches(etape.libelle, dossierStatut) ||
    (!!etape.code && normalizeForMatch(etape.code) === statutNorm) ||
    // Match partiel: statut du dossier peut être "Completion de dossier - Complété", étape.libelle = "Completion de dossier"
    (!!etape.libelle && statutNorm.startsWith(normalizeForMatch(etape.libelle)))
  );
};

/**
 * Hook pour gérer la complétion des étapes du circuit.
 * Une étape n'est marquée complète que lorsque l'utilisateur a cliqué sur "Passer à l'étape suivante" pour cette étape.
 * - Statut du dossier : indique l'étape "courante" (où en est le dossier). Seules les étapes *avant* cette étape sont considérées complétées (pas l'étape courante).
 * - statut_libelle (complété/terminé/validé) : utilisé uniquement pour les étapes avec pièces, pour refléter le backend.
 */
export const useEtapeCompletion = (
  etapes: EtapeCircuit[],
  circuit: CircuitSuivi | null,
  _documentsForCurrentDossier: any[],
  _dossierId?: string,
  _typeDocuments: any[] = [],
  _piecesJustificativesMap: Map<string, any> = new Map(),
  dossierStatut?: string
) => {
  // État local uniquement pour mise à jour optimiste après "Passer à l'étape suivante" (avant refetch)
  const [completedEtapesOptimistic, setCompletedEtapesOptimistic] = useState<Set<string>>(() => new Set());

  // Source de vérité pour l'ordre affiché : la liste etapes (triée) utilisée dans l'UI
  const source = etapes?.length > 0 ? etapes : (circuit?.etapes || []);

  // Synchroniser l'état optimiste avec les étapes complétées
  // Priorité 1 : statut du dossier (si égal au libelle/statut_libelle d'une étape, cette étape + toutes les précédentes = terminées)
  // Priorité 2 : statut_libelle des étapes (complété, terminé, validé…)
  useEffect(() => {
    const completedFromApi = new Set<string>();

    // 1) Statut du dossier = étape courante (où en est le dossier). Seules les étapes *strictement avant* sont complétées (l'étape courante exige encore un clic)
    if (dossierStatut && typeof dossierStatut === 'string' && source.length > 0) {
      const dossierStatutNorm = (dossierStatut || '').trim();
      if (dossierStatutNorm) {
        const matchIndex = source.findIndex(etape => dossierStatutMatchesEtape(etape, dossierStatutNorm));
        if (matchIndex > 0) {
          for (let i = 0; i < matchIndex; i++) {
            completedFromApi.add(source[i].id);
          }
        }
      }
    }

    // 2) En plus : étapes avec pièces dont le statut_libelle indique une complétion (complété, terminé, validé…)
    // Les étapes sans pièces ne sont jamais marquées complètes ici : elles le sont uniquement via le statut du dossier (1),
    // pour forcer l'utilisateur à cliquer sur "Passer à l'étape suivante" pour chaque étape.
    source.forEach(etape => {
      if (!etape.statut_libelle) return;
      const hasPieces = etape.pieces && etape.pieces.length > 0;
      if (!hasPieces) return;
      const statutLower = etape.statut_libelle.toLowerCase();
      const isCompleted = statutLower.includes('complété') ||
                          statutLower.includes('complete') ||
                          statutLower.includes('terminé') ||
                          statutLower.includes('termine') ||
                          statutLower.includes('validé') ||
                          statutLower.includes('valide');
      if (isCompleted) completedFromApi.add(etape.id);
    });

    // Fusionner avec l'état précédent pour ne pas perdre les étapes marquées complétées localement (ex. après "Finaliser l'étape") avant que l'API soit à jour
    setCompletedEtapesOptimistic(prev => new Set([...completedFromApi, ...prev]));
  }, [
    circuit?.id,
    circuit?.etapes?.map(e => `${e.id}-${e.libelle}-${e.statut_libelle}`).join(','),
    etapes.map(e => `${e.id}-${e.libelle}-${e.statut_libelle}`).join(','),
    dossierStatut
  ]);

  // Étapes complétées : priorité au statut du dossier, puis statut_libelle des étapes
  const getCompletedEtapesForDossier = useCallback((list: EtapeCircuit[]): Set<string> => {
    const completed = new Set<string>();
    const listSource = list?.length > 0 ? list : (circuit?.etapes || []);

    if (dossierStatut && typeof dossierStatut === 'string' && listSource.length > 0) {
      const dossierStatutNorm = (dossierStatut || '').trim();
      if (dossierStatutNorm) {
        const matchIndex = listSource.findIndex(etape => dossierStatutMatchesEtape(etape, dossierStatutNorm));
        if (matchIndex > 0) {
          for (let i = 0; i < matchIndex; i++) {
            completed.add(listSource[i].id);
          }
        }
      }
    }

    listSource.forEach(etape => {
      if (!etape.statut_libelle) return;
      const hasPieces = etape.pieces && etape.pieces.length > 0;
      if (!hasPieces) return;
      const statutLower = etape.statut_libelle.toLowerCase();
      const isCompleted = statutLower.includes('complété') ||
                          statutLower.includes('complete') ||
                          statutLower.includes('terminé') ||
                          statutLower.includes('termine') ||
                          statutLower.includes('validé') ||
                          statutLower.includes('valide');
      if (isCompleted) completed.add(etape.id);
    });

    return completed;
  }, [circuit, dossierStatut]);

  // Source de vérité : API (statut_libelle). Optimistic pour affichage immédiat après clic.
  const computedCompletedEtapes = useMemo(() => {
    const fromApi = getCompletedEtapesForDossier(etapes);
    return new Set([...fromApi, ...completedEtapesOptimistic]);
  }, [etapes, getCompletedEtapesForDossier, completedEtapesOptimistic]);

  const { etapesCompletes, allEtapesCompleted, progression } = useMemo(() => {
    if (!computedCompletedEtapes || etapes.length === 0) {
      return { etapesCompletes: 0, allEtapesCompleted: false, progression: 0 };
    }
    const etapesCompletes = computedCompletedEtapes.size;
    const progression = Math.round((etapesCompletes / etapes.length) * 100);
    const allEtapesCompleted = etapes.every(etape => computedCompletedEtapes.has(etape.id));
    return { etapesCompletes, allEtapesCompleted, progression };
  }, [etapes, computedCompletedEtapes]);

  // Mise à jour optimiste uniquement (pas de localStorage). Le vrai statut vient du backend après refetch.
  const markEtapeAsCompleted = useCallback((etapeId: string) => {
    setCompletedEtapesOptimistic(prev => new Set([...prev, etapeId]));
  }, []);

  return {
    completedEtapes: completedEtapesOptimistic,
    computedCompletedEtapes,
    etapesCompletes,
    allEtapesCompleted,
    progression,
    markEtapeAsCompleted
  };
};
