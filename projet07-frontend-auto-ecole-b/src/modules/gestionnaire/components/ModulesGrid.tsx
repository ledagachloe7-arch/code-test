import React from 'react';
import { Grid } from '@mui/material';
import ModuleCard from './ModuleCard';
import { ModuleCardProps } from '../types';

interface ModulesGridProps {
  modules: ModuleCardProps[];
}

const ModulesGrid: React.FC<ModulesGridProps> = ({ modules }) => {
  return (
    <Grid container spacing={3}>
      {modules.map((module, index) => (
        <Grid item xs={12} md={4} key={index}>
          <ModuleCard {...module} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ModulesGrid;

