// Service de validation avec mocks
import { Student } from '../../eleves/types/student';
import { ValidationHistoryEntry } from '../types';
import { getStudentsMock, validateStudentMock, rejectStudentMock, getValidationHistoryMock } from './validation.service';

class ValidationService {
  async getStudents(): Promise<Student[]> {
    try {
      // Utilisation du mock pour le développement
      return await getStudentsMock();
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des élèves: ${error.message}`);
    }
  }

  async validateStudent(studentId: string, reason?: string): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      return await validateStudentMock(studentId, reason);
    } catch (error: any) {
      throw new Error(`Erreur lors de la validation: ${error.message}`);
    }
  }

  async rejectStudent(studentId: string, reason: string): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      return await rejectStudentMock(studentId, reason);
    } catch (error: any) {
      throw new Error(`Erreur lors du rejet: ${error.message}`);
    }
  }

  async getValidationHistory(): Promise<ValidationHistoryEntry[]> {
    try {
      // Utilisation du mock pour le développement
      return await getValidationHistoryMock();
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }
  }

  async getStudentById(id: string): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      const students = await getStudentsMock();
      const student = students.find(s => s.id === id);
      if (!student) {
        throw new Error('Élève non trouvé');
      }
      return student;
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération de l'élève: ${error.message}`);
    }
  }
}

export default new ValidationService();

// Version API future (préparée mais commentée)
// import { AxiosResponse } from 'axios';
// import apiClient from '../../../shared/utils/axiosConfig';

// class ValidationService {
//   async getStudents(): Promise<Student[]> {
//     try {
//       const response: AxiosResponse<Student[]> = await apiClient.get('/validation/students');
//       return response.data;
//     } catch (error: any) {
//       if (error.response?.status === 401) {
//         throw new Error('Non autorisé à accéder aux élèves');
//       } else if (error.response?.status === 403) {
//         throw new Error('Droits insuffisants pour voir les élèves');
//       } else {
//         throw new Error('Erreur lors de la récupération des élèves');
//       }
//     }
//   }
//   // ... autres méthodes API
// }