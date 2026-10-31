import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';

export interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  children: React.ReactNode;
  rightHeader?: React.ReactNode;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  icon,
  iconBgColor = 'primary.light',
  children,
  rightHeader,
}) => (
  <Card elevation={0} sx={{ mb: 3, boxShadow: 'none', borderRadius: 0 }}>
    <CardContent sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          {icon && (
            <Avatar sx={{ bgcolor: iconBgColor, width: 48, height: 48, flexShrink: 0 }}>
              {icon}
            </Avatar>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {rightHeader && (
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            {rightHeader}
          </Box>
        )}
      </Box>
      {children}
    </CardContent>
  </Card>
);

export default DashboardSection;
