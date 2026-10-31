// Service CNEPC avec mocks
import { Batch, CNEPCStatus, BatchStatus, CNEPCResponse } from '../types';

// Mock des lots
const mockBatches: Batch[] = [
  {
    id: '1',
    name: 'Lot Janvier 2024',
    description: 'Premier lot de l\'année 2024',
    students: ['1', '2'],
    status: 'ready',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
  {
    id: '2',
    name: 'Lot Février 2024',
    description: 'Deuxième lot de l\'année 2024',
    students: ['3', '4', '5'],
    status: 'sent',
    createdAt: '2024-02-01T10:30:00Z',
    updatedAt: '2024-02-01T14:45:00Z',
  },
];

// Mock de la récupération des lots
export async function getBatchesMock(): Promise<Batch[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockBatches);
    }, 600);
  });
}

// Mock de la création d'un lot
export async function createBatchMock(batchData: {
  name: string;
  description?: string;
  students: string[];
}): Promise<Batch> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newBatch: Batch = {
        id: (mockBatches.length + 1).toString(),
        ...batchData,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockBatches.push(newBatch);
      resolve(newBatch);
    }, 800);
  });
}

// Mock de l'envoi d'un lot au CNEPC
export async function sendBatchMock(batchId: string): Promise<CNEPCResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const batch = mockBatches.find(b => b.id === batchId);
      if (batch) {
        batch.status = 'sent';
        batch.updatedAt = new Date().toISOString();
        resolve({
          batchId,
          success: true,
          message: 'Lot envoyé avec succès au CNEPC',
          data: { sentAt: new Date().toISOString() },
        });
      } else {
        reject(new Error('Lot non trouvé'));
      }
    }, 1200);
  });
}

// Mock de la vérification du statut CNEPC
export async function getCNEPCStatusMock(): Promise<CNEPCStatus> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        isOnline: Math.random() > 0.2, // 80% de chance d'être en ligne
        lastCheck: new Date().toISOString(),
        version: '1.2.3',
      });
    }, 400);
  });
}

// Mock de la récupération du statut d'un lot
export async function getBatchStatusMock(batchId: string): Promise<BatchStatus> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const batch = mockBatches.find(b => b.id === batchId);
      if (batch) {
        resolve({
          batchId,
          status: batch.status as any,
          progress: batch.status === 'sent' ? 100 : 0,
          message: `Lot ${batch.status}`,
          completedAt: batch.status === 'sent' ? batch.updatedAt : undefined,
        });
      } else {
        reject(new Error('Lot non trouvé'));
      }
    }, 300);
  });
}

// Mock de la nouvelle tentative d'envoi
export async function retryFailedBatchMock(batchId: string): Promise<CNEPCResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const batch = mockBatches.find(b => b.id === batchId);
      if (batch && batch.status === 'failed') {
        batch.status = 'sent';
        batch.updatedAt = new Date().toISOString();
        resolve({
          batchId,
          success: true,
          message: 'Nouvelle tentative d\'envoi réussie',
          data: { retryAt: new Date().toISOString() },
        });
      } else {
        reject(new Error('Lot non éligible pour une nouvelle tentative'));
      }
    }, 1000);
  });
}

// Mock de la récupération de la réponse CNEPC
export async function getCNEPCResponseMock(batchId: string): Promise<CNEPCResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const batch = mockBatches.find(b => b.id === batchId);
      if (batch && batch.status === 'sent') {
        resolve({
          batchId,
          success: true,
          message: 'Réponse CNEPC reçue',
          data: {
            responseCode: '200',
            responseMessage: 'Traitement réussi',
            processedAt: new Date().toISOString(),
          },
        });
      } else {
        reject(new Error('Aucune réponse disponible pour ce lot'));
      }
    }, 500);
  });
}

// Version API future (préparée mais commentée)
// export async function getBatches(): Promise<Batch[]> {
//   const { data } = await axios.get("/cnepc/batches");
//   return data;
// }

// export async function sendBatch(batchId: string): Promise<CNEPCResponse> {
//   const { data } = await axios.post("/cnepc/send-batch", { batchId });
//   return data;
// }

// export async function getCNEPCStatus(): Promise<CNEPCStatus> {
//   const { data } = await axios.get("/cnepc/status");
//   return data;
// }
