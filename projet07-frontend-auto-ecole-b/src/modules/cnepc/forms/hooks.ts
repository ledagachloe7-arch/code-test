import { useState, useEffect, useMemo, useCallback } from 'react';
import { AutoEcole, Formation, TypeDemande, Referentiel, autoEcoleService, typeDemandeService, referentielService } from '../services';
import { useAppStore } from '../../../store';
import type { LieuExamenData } from './types';

export const useAutoEcoles = () => {
  const [autoEcoles, setAutoEcoles] = useState<AutoEcole[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAutoEcoles = async () => {
    setLoading(true);
    try {
      const response = await autoEcoleService.getAutoEcoles(1, 100);
      setAutoEcoles(response.data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des auto-écoles:', err);
      throw new Error('Impossible de charger les auto-écoles');
    } finally {
      setLoading(false);
    }
  };

  return { autoEcoles, loading, loadAutoEcoles };
};

export const useFormations = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFormations = async (autoEcoleId: string) => {
    setLoading(true);
    try {
      const data = await autoEcoleService.getFormationsByAutoEcole(autoEcoleId);
      setFormations(data.filter(f => f.statut));
    } catch (err: any) {
      console.error('Erreur lors du chargement des formations:', err);
      throw new Error('Impossible de charger les formations');
    } finally {
      setLoading(false);
    }
  };

  return { formations, loading, loadFormations };
};

export const useTypeDemandes = () => {
  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTypeDemandes = async () => {
    setLoading(true);
    try {
      const response = await typeDemandeService.getTypeDemandes(1, 100);
      setTypeDemandes(response.data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types de demande:', err);
    } finally {
      setLoading(false);
    }
  };

  return { typeDemandes, loading, loadTypeDemandes };
};

export const useReferentiels = () => {
  const [referentiels, setReferentiels] = useState<Referentiel[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReferentiels = async () => {
    setLoading(true);
    try {
      const response = await referentielService.getReferentiels(1, 100);
      const referentielsTypePermis = (response.data || []).filter(
        (referentiel) => referentiel.type_ref === 'type_permis'
      );
      setReferentiels(referentielsTypePermis);
    } catch (err: any) {
      console.error('Erreur lors du chargement des référentiels:', err);
    } finally {
      setLoading(false);
    }
  };

  return { referentiels, loading, loadReferentiels };
};

/** Charge l’auto-école CNEPC et ses formations — GET /auto-ecoles/cnepc */
export const useCnepcBundle = (enabled = true) => {
  const [autoEcole, setAutoEcole] = useState<AutoEcole | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const bundle = await autoEcoleService.getCnepcAutoEcole();
      if (bundle) {
        setAutoEcole(bundle.autoEcole);
        let list = bundle.formations;
        if (list.length === 0 && bundle.autoEcole.id) {
          const fallback = await autoEcoleService.getFormationsByAutoEcole(bundle.autoEcole.id);
          list = (Array.isArray(fallback) ? fallback : []).filter((f) => f.statut !== false);
        }
        setFormations(list);
        if (list.length === 0) {
          setError('Aucune formation active pour l’auto-école CNEPC.');
        }
      } else {
        setAutoEcole(null);
        setFormations([]);
        setError('Auto-école CNEPC introuvable (GET /auto-ecoles/cnepc).');
      }
    } catch (err) {
      console.error('GET /auto-ecoles/cnepc:', err);
      setAutoEcole(null);
      setFormations([]);
      setError('Impossible de charger l’auto-école CNEPC.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setAutoEcole(null);
      setFormations([]);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load]);

  return { autoEcole, formations, loading, error, reload: load };
};

/**
 * Synchronise auto-école CNEPC + formation lorsque le référentiel type permis est connu
 * (renouvellement / duplicata — pas « nouveau permis »).
 * @deprecated Préférer useCnepcBundle + sélection manuelle dans FinalisationStep.
 */
export const useCnepcFormationSync = (options: {
  referencielId: string;
  isNouveauPermis: boolean;
  enabled?: boolean;
  onResolved: (payload: {
    autoEcole: AutoEcole;
    formation: Formation;
  }) => void;
}) => {
  const { referencielId, isNouveauPermis, enabled = true, onResolved } = options;
  const onResolvedRef = useMemo(() => onResolved, [onResolved]);

  useEffect(() => {
    if (!enabled || isNouveauPermis) return;
    const refId = referencielId?.trim();
    if (!refId) return;

    let cancelled = false;
    const run = async () => {
      try {
        const resolved = await autoEcoleService.resolveCnepcForReferenciel(refId);
        if (!cancelled && resolved) {
          onResolvedRef(resolved);
        }
      } catch (err) {
        console.error('Synchronisation CNEPC (référentiel):', err);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [referencielId, isNouveauPermis, enabled, onResolvedRef]);
};

function centreIdFromUserRecord(user: unknown): string {
  if (!user || typeof user !== 'object') return '';
  const u = user as Record<string, unknown>;
  const raw = u.centre_id ?? (u.centre as { id?: string } | undefined)?.id;
  return typeof raw === 'string' ? raw.trim() : '';
}

function centreIdFromStorage(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    const raw = localStorage.getItem('user_data') || localStorage.getItem('user');
    if (!raw) return '';
    const p = JSON.parse(raw) as { centre_id?: string };
    return (p.centre_id || '').trim();
  } catch {
    return '';
  }
}

type ReferentielExt = Referentiel & { parent_id?: string; parent?: { id?: string } };

/**
 * Résout province_id + centre_id à partir du centre de l’agent connecté
 * (API référentiel centre → parent = province).
 */
export const useAgentLieuExamen = (): {
  lieu: LieuExamenData;
  labels: { province: string; centre: string };
  loading: boolean;
  error: string | null;
} => {
  const { user } = useAppStore();
  const centreId = useMemo(
    () => centreIdFromUserRecord(user) || centreIdFromStorage(),
    [user]
  );

  const [lieu, setLieu] = useState<LieuExamenData>({ province_id: '', centre_id: '' });
  const [labels, setLabels] = useState({ province: '', centre: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centreId) {
      setLieu({ province_id: '', centre_id: '' });
      setLabels({ province: '', centre: '' });
      setError(
        user?.id
          ? 'Aucun centre n’est associé à votre compte : impossible de renseigner province et centre du dossier.'
          : null
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const centre = (await referentielService.getReferentielById(centreId)) as ReferentielExt;
        console.log('CENTRE COMPLET RETOURNÉ PAR API :', centre);
        if (cancelled) return;
        const provinceId = String(centre.parent_id ?? centre.parent?.id ?? '').trim();
        setLieu({ province_id: provinceId, centre_id: centreId });
        const centreLabel = centre.libelle || centre.code || centreId;

        let provinceLabel = '';
        if (provinceId) {
          try {
            const prov = await referentielService.getReferentielById(provinceId);
            if (!cancelled) {
              provinceLabel = prov.libelle || prov.code || provinceId;
            }
          } catch {
            provinceLabel = provinceId;
          }
        }

        if (!cancelled) {
          setLabels({ province: provinceLabel, centre: centreLabel });
          if (!provinceId) {
            setError(
              'Le centre n’a pas de province parente renseignée dans le référentiel : contactez l’administrateur.'
            );
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          console.error('useAgentLieuExamen:', e);
          setLieu({ province_id: '', centre_id: '' });
          setLabels({ province: '', centre: '' });
          setError('Impossible de charger votre centre (référentiel).');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [centreId, user]);

  return { lieu, labels, loading, error };
};

