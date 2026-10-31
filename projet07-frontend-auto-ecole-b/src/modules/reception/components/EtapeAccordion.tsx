import React from 'react';
import { CircuitEtapeStepContent } from './CircuitEtapeStepContent';
import type { EtapeAccordionProps } from './CircuitEtapeStepContent';

export type { EtapeAccordionProps };

/** Accordéon MUI : délègue tout le métier à CircuitEtapeStepContent. */
export const EtapeAccordion: React.FC<EtapeAccordionProps> = (props) => (
  <CircuitEtapeStepContent {...props} presentation="accordion" />
);
