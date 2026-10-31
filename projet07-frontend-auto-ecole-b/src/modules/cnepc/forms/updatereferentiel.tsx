import { Alert, Box, Button, Card, CardContent, TextField } from "@mui/material"
import { useState } from "react";
import { referentielService } from "../../auth/services/referentiel.services";
import { Referentiel, ReferentielFormulaire } from "../../../shared/model/referentiel";

const PageUpdateReferenciel: React.FC = () => {
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [updatData, setUpdateFormData] = useState<Referentiel>({ id: 0, code: '', libelle: '', statut: true, type_ref: '', description: '' });
    const [formData, setFormData] = useState<ReferentielFormulaire>({ code: '', libelle: '', statut: true, type_ref: '', description: '' });
  const [errors, setErrors] = useState<Partial<ReferentielFormulaire>>({});

    const updateDeRef = async (event: React.FormEvent) => {
        const resUpdate = await referentielService.updateReferentiels({
            code: updatData.code,
            id: updatData.id,
            libelle: formData.libelle,
            statut: updatData.statut,
            type_ref: updatData.type_ref,
            description: formData.description

        })
        console.log(resUpdate)
        if (resUpdate) {
            // showFormulaire()
            //getReferentiel();
            setUpdateFormData({ id: 0, code: '', libelle: '', statut: true, type_ref: '', description: '' })

            setMessage({ type: 'success', text: 'Modification réussie !' });

            setTimeout(() => {

            }, 100);
        }
    }
  const handleInputChange = (field: keyof ReferentielFormulaire) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
    return (<Card>
        <CardContent>
            {message && (
                <Alert
                    severity={message.type}
                    sx={{ mb: 2 }}
                    onClose={() => setMessage(null)}
                >
                    {message.text}
                </Alert>
            )}
            <form onSubmit={updateDeRef}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                    <TextField
                        label="Libelle"
                        type="text"
                        onChange={handleInputChange('libelle')}
                        fullWidth
                        value={formData.libelle}
                        size={window.innerWidth < 600 ? 'small' : 'medium'}

                    />

                    <TextField
                        label="Code de reference"
                        type="text"
                        onChange={handleInputChange('code')}
                        fullWidth
                        value={formData.code}
                        size={window.innerWidth < 600 ? 'small' : 'medium'}
                    />
                    <TextField
                        label="Type de Referentiel"
                        type="text"
                        fullWidth
                        value={formData.type_ref}
                        onChange={handleInputChange('type_ref')}
                        size={window.innerWidth < 600 ? 'small' : 'medium'}
                    />
                    <TextField
                        label="Description"
                        type="text"
                        fullWidth
                        onChange={handleInputChange('description')}
                        value={formData.description}
                        size={window.innerWidth < 600 ? 'small' : 'medium'}
                    />
                    {/* <TextField
                label="Statut"
                type="radio"
                onChange={handleInputChange('statut')}
                fullWidth
                value={formData.statut}
                size={window.innerWidth < 600 ? 'small' : 'medium'}
              /> */}

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size={window.innerWidth < 600 ? 'medium' : 'large'}

                        sx={{
                            mt: { xs: 1.5, sm: 2 },
                            backgroundColor: '#50C786',
                            '&:hover': { backgroundColor: '#40B676' },
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            py: { xs: 1.5, sm: 2 }
                        }}
                    >
                         Modifier Referentiel
                    </Button>
                </Box>
            </form>
        </CardContent>
    </Card>)
}