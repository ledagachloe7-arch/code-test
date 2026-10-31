import { EpreuveStatut, EpreuveAttempt } from '../../types';

export const MAX_ATTEMPTS = 3;

export function computeOverall(attempts?: EpreuveAttempt[], legacy?: EpreuveStatut): EpreuveStatut {
  if (legacy && legacy !== 'non_saisi') return legacy;
  if (!attempts || attempts.length === 0) return 'non_saisi';
  if (attempts.some(a => a.result === 'reussi')) return 'reussi';
  if (attempts.length >= MAX_ATTEMPTS && attempts.every(a => a.result !== 'reussi')) return 'echoue';
  return attempts[attempts.length - 1].result;
}

export function computeGeneral(
  creneaux: EpreuveStatut,
  codeConduite: EpreuveStatut,
  tourVille: EpreuveStatut
): EpreuveStatut {
  const statuses: EpreuveStatut[] = [creneaux, codeConduite, tourVille];
  
  if (statuses.every(s => s === 'reussi')) return 'reussi';
  if (statuses.some(s => s === 'echoue')) return 'echoue';
  if (statuses.some(s => s === 'absent')) return 'absent';
  
  return 'non_saisi';
}

