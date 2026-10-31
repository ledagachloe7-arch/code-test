import { Etape } from "./etape"

export interface Transition {
    id?: string,
    circuit_id: string,
    code: string,
    libelle: string,
    source_etape_id: string,
    cible_etape_id: string
    source?: Etape,
    cible?: Etape
}