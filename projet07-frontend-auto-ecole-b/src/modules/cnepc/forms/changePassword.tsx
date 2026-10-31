import { useState } from "react";
import { Person } from "./updateinfoAutoEcole";
import { ChangePasswordForm } from "../../eleves/types/changepassword";
import { Box, Button, Card, Container, TextField, Typography } from "@mui/material";
import { authService } from "../../auth";

const PageChangePassWord: React.FC = () => {
    const [formData, setFormData] = useState<ChangePasswordForm>({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });
    const [errors, setErrors] = useState<Partial<ChangePasswordForm>>({});
    const handleInputChange = (field: keyof ChangePasswordForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: event.target.value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<ChangePasswordForm> = {};



        if (!formData.current_password) {
            newErrors.current_password = 'Le mot de passe est requis';
        } else if (formData.current_password.length < 6) {
            newErrors.current_password = 'Le mot de passe doit contenir au moins 6 caractères';
        }

        if (!formData.new_password) {
            newErrors.new_password = 'Le mot de passe est requis';
        } else if (formData.new_password.length < 6) {
            newErrors.new_password = 'Le mot de passe doit contenir au moins 6 caractères';
        }

        if (!formData.new_password_confirmation) {
            newErrors.new_password_confirmation = 'Le mot de passe est requis';
        } else if (formData.new_password_confirmation.length < 6) {
            newErrors.new_password_confirmation = 'Le mot de passe doit contenir au moins 6 caractères';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const onSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }
        try {
            await authService.changePassword(formData)
        } catch (e) {
            console.log(e)
        }
    }
    return (<Box>
        <Box>
            <Card variant='outlined'> <Container maxWidth="sm">
                <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                        mb: { xs: 2, sm: 3 },
                        fontWeight: 'bold',

                    }}
                    className="font-display"
                >
                    Modifier le Mots de Passe
                </Typography>
                <form onSubmit={onSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>

                        <TextField
                            label="Mot de passe actuelle"
                            type="password"
                            fullWidth
                            value={formData.current_password}
                            onChange={handleInputChange('current_password')}
                            error={!!errors.current_password}
                            helperText={errors.current_password}
                            size={window.innerWidth < 600 ? 'small' : 'medium'}
                        />
                        <TextField
                            label="Nouveau Mot de passe"
                            type="password"
                            fullWidth
                            value={formData.new_password}
                            onChange={handleInputChange('new_password')}
                            error={!!errors.new_password}
                            helperText={errors.new_password}
                            size={window.innerWidth < 600 ? 'small' : 'medium'}
                        />
                        <TextField
                            label="Confirmation du Nouveau Mot de passe"
                            type="password"
                            fullWidth
                            value={formData.new_password_confirmation}
                            onChange={handleInputChange('new_password_confirmation')}
                            error={!!errors.new_password_confirmation}
                            helperText={errors.new_password_confirmation}
                            size={window.innerWidth < 600 ? 'small' : 'medium'}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size={window.innerWidth < 600 ? 'medium' : 'large'}

                            sx={{

                                backgroundColor: '#50C786',
                                '&:hover': { backgroundColor: '#40B676' },


                            }}
                        >
                            modifier
                        </Button>
                        <br />
                    </Box>
                </form>
            </Container></Card>
        </Box>
    </Box>)
}

export default PageChangePassWord;