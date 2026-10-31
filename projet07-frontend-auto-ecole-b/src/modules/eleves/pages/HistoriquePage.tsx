import React from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon
} from '@mui/icons-material';

const HistoriquePage: React.FC = () => {
  const historiqueItems = [
    {
      date: '2024-01-15',
      time: '14:30',
      action: 'Nouvelle demande d\'inscription',
      description: 'Marie Dupont a soumis une demande d\'inscription',
      icon: <AssignmentIcon />,
      color: '#1976d2'
    },
    {
      date: '2024-01-14',
      time: '09:15',
      action: 'Inscription validée',
      description: 'Jean Ngoma a été inscrit avec succès',
      icon: <CheckCircleIcon />,
      color: '#4caf50'
    },
    {
      date: '2024-01-13',
      time: '16:45',
      action: 'Dossier transmis au CNEPC',
      description: 'Lot de 5 dossiers envoyé au CNEPC',
      icon: <SendIcon />,
      color: '#ff9800'
    },
    {
      date: '2024-01-12',
      time: '11:20',
      action: 'Nouvelle inscription',
      description: 'Alice Martin s\'est inscrite',
      icon: <SchoolIcon />,
      color: '#9c27b0'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Historique des inscriptions
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Suivi de toutes les actions liées aux inscriptions des élèves
      </Typography>
      
      <Container maxWidth="lg">
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Activité récente
            </Typography>
            <List>
              {historiqueItems.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <Box
                        sx={{
                          backgroundColor: item.color,
                          color: 'white',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {item.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="h6" component="span">
                            {item.action}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {item.date} à {item.time}
                          </Typography>
                        </Box>
                      }
                      secondary={item.description}
                    />
                  </ListItem>
                  {index < historiqueItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default HistoriquePage;
