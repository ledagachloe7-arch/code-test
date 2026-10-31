import { useState, useRef } from 'react';
import axiosClient from '../../../../shared/utils/axiosConfig';

interface UseDocumentUploadProps {
  dossierId: string | undefined;
  formatFileSize: (bytes: number) => string;
  onUploadSuccess: () => void;
  onError: (message: string) => void;
}

export const useDocumentUpload = ({
  dossierId,
  formatFileSize,
  onUploadSuccess,
  onError
}: UseDocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadNewDocument = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !dossierId) return;

    const file = files[0];
    setUploading(true);

    try {
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        onError('Le fichier ne doit pas dépasser 5 MB');
        setUploading(false);
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        onError('Format non autorisé. Utilisez PDF, JPG ou PNG');
        setUploading(false);
        return;
      }

      const cleanFileName = file.name.trim();
      
      const formData = new FormData();
      formData.append('documentable_id', dossierId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      formData.append('valide', '0');
      formData.append('commentaires', '');
      formData.append('fichier', file, cleanFileName);

      const response = await axiosClient.post('/documents', formData, {
        timeout: 300000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success && response.data.data) {
        onUploadSuccess();
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'upload du document:', error);
      
      let errorMessage = 'Erreur lors de l\'upload du document';
      
      if (error.response?.status === 422) {
        if (error.response.data?.errors) {
          const errors = Object.entries(error.response.data.errors)
            .map(([field, messages]: [string, any]) => {
              const fieldName = field.replace(/_/g, ' ');
              const messagesList = Array.isArray(messages) ? messages : [messages];
              return `${fieldName}: ${messagesList.join(', ')}`;
            })
            .join('\n');
          errorMessage = `Erreurs de validation:\n${errors}`;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = 'Erreur de validation. Veuillez vérifier les données du document.';
        }
      } else if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.errors) {
          const errors = Object.entries(error.response.data.errors)
            .map(([field, messages]: [string, any]) => 
              `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
            )
            .join('; ');
          errorMessage = `Erreurs de validation: ${errors}`;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError(errorMessage.length > 300 ? errorMessage.substring(0, 300) + '...' : errorMessage);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return {
    uploading,
    fileInputRef,
    handleUploadNewDocument,
    handleFileSelect
  };
};

