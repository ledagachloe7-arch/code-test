import { Circuit } from './circuit'
import { Statut } from '../../statut/types/statut';
import { PieceJustificative } from './piece-justificative';

export interface Etape {
  id: string
  code: string
  libelle: string
  ordre: number
  auto_advance: boolean
  created_at?: string
  updated_at?: string
  circuit_id: string
  statut_id?: string
  roles?: string[]

  // Relations
  circuit?: Circuit
  statut?: Statut
  pieces?: PieceJustificative[],
  statut_libelle?: string
}
