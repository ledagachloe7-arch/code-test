// Service CNEPC avec mocks
import { CNEPCStatus, BatchStatus, CNEPCResponse } from '../types';
import { getCNEPCStatusMock, getBatchStatusMock, retryFailedBatchMock, getCNEPCResponseMock } from './cnepc.service';

class CNEPCService {
  async getCNEPCStatus(): Promise<CNEPCStatus> {
    try {
      // Utilisation du mock pour le développement
      return await getCNEPCStatusMock();
    } catch (error: any) {
      throw new Error(`Erreur lors de la vérification du statut CNEPC: ${error.message}`);
    }
  }

  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    try {
      // Utilisation du mock pour le développement
      return await getBatchStatusMock(batchId);
    } catch (error: any) {
      throw new Error(`Erreur lors de la vérification du statut du lot: ${error.message}`);
    }
  }

  async retryFailedBatch(batchId: string): Promise<CNEPCResponse> {
    try {
      // Utilisation du mock pour le développement
      return await retryFailedBatchMock(batchId);
    } catch (error: any) {
      throw new Error(`Erreur lors de la nouvelle tentative: ${error.message}`);
    }
  }

  async getCNEPCResponse(batchId: string): Promise<CNEPCResponse> {
    try {
      // Utilisation du mock pour le développement
      return await getCNEPCResponseMock(batchId);
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération de la réponse: ${error.message}`);
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      // Utilisation du mock pour le développement
      const status = await getCNEPCStatusMock();
      return status.isOnline;
    } catch (error: any) {
      return false;
    }
  }

  async getSystemInfo(): Promise<{ version: string; lastUpdate: string }> {
    try {
      // Utilisation du mock pour le développement
      return {
        version: '1.2.3',
        lastUpdate: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des informations: ${error.message}`);
    }
  }
}

export default new CNEPCService();

// Version API future (préparée mais commentée)
// import { AxiosResponse } from 'axios';
// import apiClient from '../../../shared/utils/axiosConfig';

// class CNEPCService {
//   async getCNEPCStatus(): Promise<CNEPCStatus> {
//     try {
//       const response: AxiosResponse<CNEPCStatus> = await apiClient.get('/cnepc/status');
//       return response.data;
//     } catch (error: any) {
//       throw new Error(`Erreur lors de la vérification du statut CNEPC: ${error.message}`);
//     }
//   }
//   // ... autres méthodes API
// }