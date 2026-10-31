import React from 'react';
import { TraitementEtapeContenu, type EtapeAccordionProps } from './TraitementEtapeContenu';

export type TraitementEtapeViewProps = Omit<EtapeAccordionProps, 'presentation' | 'expanded' | 'onChange'>;

/** Vue étape wizard : délègue à `TraitementEtapeContenu` (aucun import depuis `reception/components`). */
export const TraitementEtapeView: React.FC<TraitementEtapeViewProps> = (props) => (
  <TraitementEtapeContenu {...props} presentation="wizard" expanded onChange={() => {}} />
);
