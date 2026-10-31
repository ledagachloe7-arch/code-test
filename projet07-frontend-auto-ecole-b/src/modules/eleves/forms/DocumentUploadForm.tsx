import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Button, 
  Typography, 
  Box, 
  LinearProgress,
  Chip,
  Alert
} from '@mui/material';
import { CloudUpload, Delete, Visibility } from '@mui/icons-material';

interface DocumentUploadFormProps {
  onUpload: (file: File, type: string) => void;
  onDelete: (documentId: string) => void;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  isLoading?: boolean;
}

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({
  onUpload,
  onDelete,
  documents,
  isLoading = false,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const documentTypes = [
    { key: 'identity', label: 'Carte d\'identité', required: true },
    { key: 'photo', label: 'Photo', required: true },
    { key: 'medical', label: 'Certificat médical', required: true },
    { key: 'aptitude', label: 'Attestation d\'aptitude (CNEPC)', required: true },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file, type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file, type);
    }
  };

  const getDocumentByType = (type: string) => {
    return documents.find(doc => doc.type === type);
  };

  const isDocumentComplete = () => {
    return documentTypes.every(type => 
      getDocumentByType(type.key) || !type.required
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" className="mb-4">
          Documents obligatoires
        </Typography>
        
        {!isDocumentComplete() && (
          <Alert severity="warning" className="mb-4">
            Tous les documents obligatoires doivent être uploadés pour valider le dossier.
          </Alert>
        )}

        <div className="space-y-4">
          {documentTypes.map((docType) => {
            const existingDoc = getDocumentByType(docType.key);
            
            return (
              <div key={docType.key} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <Typography variant="subtitle1">
                    {docType.label}
                    {docType.required && <span className="text-red-500 ml-1">*</span>}
                  </Typography>
                  {existingDoc && (
                    <Chip 
                      label="Uploadé" 
                      color="success" 
                      size="small"
                    />
                  )}
                </div>

                {existingDoc ? (
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <Typography variant="body2">
                        {existingDoc.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({new Date(existingDoc.uploadedAt).toLocaleDateString()})
                      </Typography>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => window.open(existingDoc.url, '_blank')}
                      >
                        Voir
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => onDelete(existingDoc.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, docType.key)}
                  >
                    <CloudUpload className="text-gray-400 mb-2" />
                    <Typography variant="body2" color="text.secondary" className="mb-2">
                      Glissez-déposez un fichier ici ou cliquez pour sélectionner
                    </Typography>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect(e, docType.key)}
                      className="hidden"
                      id={`file-${docType.key}`}
                    />
                    <label htmlFor={`file-${docType.key}`}>
                      <Button
                        variant="outlined"
                        component="span"
                        disabled={isLoading}
                      >
                        Sélectionner un fichier
                      </Button>
                    </label>
                  </div>
                )}

                {isLoading && uploadProgress > 0 && (
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    className="mt-2"
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUploadForm;
