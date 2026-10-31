// Service des élèves pour validation avec mocks
import { Student } from '../../eleves/types/student';
import { getStudentsMock, getStudentByIdMock } from './validation.service';

class StudentService {
  async getStudents(): Promise<Student[]> {
    try {
      // Utilisation du mock pour le développement
      return await getStudentsMock();
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des élèves: ${error.message}`);
    }
  }

  async getStudentById(id: string): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      return await getStudentByIdMock(id);
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération de l'élève: ${error.message}`);
    }
  }

  async updateStudentStatus(id: string, status: string): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      const student = await getStudentByIdMock(id);
      student.status = status as any;
      student.updatedAt = new Date();
      return student;
    } catch (error: any) {
      throw new Error(`Erreur lors de la mise à jour du statut: ${error.message}`);
    }
  }
}

export default new StudentService();

// Version API future (préparée mais commentée)
// import { AxiosResponse } from 'axios';
// import apiClient from '../../../shared/utils/axiosConfig';

// class StudentService {
//   async getStudents(): Promise<Student[]> {
//     try {
//       const response: AxiosResponse<Student[]> = await apiClient.get('/students');
//       return response.data;
//     } catch (error: any) {
//       throw new Error(`Erreur lors de la récupération des élèves: ${error.message}`);
//     }
//   }
//   // ... autres méthodes API
// }