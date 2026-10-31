// Service des lots avec mocks
import { Batch, BatchFormData, BatchHistoryEntry, AvailableStudent } from '../types';
import { getBatchesMock, createBatchMock, sendBatchMock } from './cnepc.service';

class BatchService {
  async getBatches(): Promise<Batch[]> {
    try {
      // Utilisation du mock pour le développement
      return await getBatchesMock();
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des lots: ${error.message}`);
    }
  }

  async getBatchById(id: string): Promise<Batch> {
    try {
      // Utilisation du mock pour le développement
      const batches = await getBatchesMock();
      const batch = batches.find(b => b.id === id);
      if (!batch) {
        throw new Error('Lot non trouvé');
      }
      return batch;
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération du lot: ${error.message}`);
    }
  }

  async createBatch(batchData: BatchFormData): Promise<Batch> {
    try {
      // Utilisation du mock pour le développement
      return await createBatchMock(batchData);
    } catch (error: any) {
      throw new Error(`Erreur lors de la création du lot: ${error.message}`);
    }
  }

  async updateBatch(id: string, batchData: Partial<BatchFormData>): Promise<Batch> {
    try {
      // Utilisation du mock pour le développement
      const batch = await this.getBatchById(id);
      return { ...batch, ...batchData, updatedAt: new Date().toISOString() };
    } catch (error: any) {
      throw new Error(`Erreur lors de la mise à jour du lot: ${error.message}`);
    }
  }

  async deleteBatch(id: string): Promise<void> {
    try {
      // Utilisation du mock pour le développement
      console.log(`Lot ${id} supprimé (mock)`);
    } catch (error: any) {
      throw new Error(`Erreur lors de la suppression du lot: ${error.message}`);
    }
  }

  async sendBatch(batchId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Utilisation du mock pour le développement
      const response = await sendBatchMock(batchId);
      return {
        success: response.success,
        message: response.message
      };
    } catch (error: any) {
      throw new Error(`Erreur lors de l'envoi du lot: ${error.message}`);
    }
  }

  async getBatchHistory(batchId: string): Promise<BatchHistoryEntry[]> {
    try {
      // Utilisation du mock pour le développement
      return [
        {
          id: '1',
          batchId,
          action: 'created',
          timestamp: new Date().toISOString(),
          details: 'Lot créé',
          userId: 'admin@dgtt.com'
        },
        {
          id: '2',
          batchId,
          action: 'sent',
          timestamp: new Date().toISOString(),
          details: 'Lot envoyé au CNEPC',
          userId: 'admin@dgtt.com'
        }
      ];
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }
  }

  async getAvailableStudents(): Promise<AvailableStudent[]> {
    try {
      // Utilisation du mock pour le développement
      return [
        {
          id: '1',
          firstName: 'Marie',
          lastName: 'Dupont',
          email: 'marie.dupont@email.com',
          status: 'validated',
          documentsCount: 4,
          lastUpdated: new Date().toISOString()
        },
        {
          id: '2',
          firstName: 'Jean',
          lastName: 'Ngoma',
          email: 'jean.ngoma@email.com',
          status: 'validated',
          documentsCount: 4,
          lastUpdated: new Date().toISOString()
        }
      ];
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des élèves disponibles: ${error.message}`);
    }
  }

  async addStudentToBatch(batchId: string, studentId: string): Promise<Batch> {
    try {
      // Utilisation du mock pour le développement
      const batch = await this.getBatchById(batchId);
      if (!batch.students.includes(studentId)) {
        batch.students.push(studentId);
        batch.updatedAt = new Date().toISOString();
      }
      return batch;
    } catch (error: any) {
      throw new Error(`Erreur lors de l'ajout de l'élève: ${error.message}`);
    }
  }

  async removeStudentFromBatch(batchId: string, studentId: string): Promise<Batch> {
    try {
      // Utilisation du mock pour le développement
      const batch = await this.getBatchById(batchId);
      batch.students = batch.students.filter(id => id !== studentId);
      batch.updatedAt = new Date().toISOString();
      return batch;
    } catch (error: any) {
      throw new Error(`Erreur lors de la suppression de l'élève: ${error.message}`);
    }
  }
}

export default new BatchService();

// Version API future (préparée mais commentée)
// import { AxiosResponse } from 'axios';
// import apiClient from '../../../shared/utils/axiosConfig';

// class BatchService {
//   async getBatches(): Promise<Batch[]> {
//     try {
//       const response: AxiosResponse<Batch[]> = await apiClient.get('/cnepc/batches');
//       return response.data;
//     } catch (error: any) {
//       throw new Error(`Erreur lors de la récupération des lots: ${error.message}`);
//     }
//   }
//   // ... autres méthodes API
// }