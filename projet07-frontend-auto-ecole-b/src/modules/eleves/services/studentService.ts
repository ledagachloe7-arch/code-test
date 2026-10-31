// Service des élèves avec mocks
import { Student, StudentFormData } from '../types/student';
import { getElevesMock, getEleveByIdMock, createEleveMock, updateEleveMock, deleteEleveMock } from './eleve.service';

class StudentService {
  async getStudents(): Promise<Student[]> {
    try {
      // Utilisation du mock pour le développement
      return await getElevesMock();
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des élèves: ${error.message}`);
    }
  }

  async getStudentById(id: string): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      return await getEleveByIdMock(id);
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération de l'élève: ${error.message}`);
    }
  }

  async createStudent(studentData: StudentFormData): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      return await createEleveMock(studentData);
    } catch (error: any) {
      throw new Error(`Erreur lors de la création de l'élève: ${error.message}`);
    }
  }

  async updateStudent(id: string, studentData: Partial<StudentFormData>): Promise<Student> {
    try {
      // Utilisation du mock pour le développement
      return await updateEleveMock(id, studentData);
    } catch (error: any) {
      throw new Error(`Erreur lors de la mise à jour de l'élève: ${error.message}`);
    }
  }

  async deleteStudent(id: string): Promise<void> {
    try {
      // Utilisation du mock pour le développement
      await deleteEleveMock(id);
    } catch (error: any) {
      throw new Error(`Erreur lors de la suppression de l'élève: ${error.message}`);
    }
  }

  async searchStudents(query: string): Promise<Student[]> {
    try {
      // Utilisation du mock pour le développement
      const students = await getElevesMock();
      return students.filter(student => 
        student.firstName.toLowerCase().includes(query.toLowerCase()) ||
        student.lastName.toLowerCase().includes(query.toLowerCase()) ||
        student.email.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error: any) {
      throw new Error(`Erreur lors de la recherche: ${error.message}`);
    }
  }

  async getStudentsByStatus(status: string): Promise<Student[]> {
    try {
      // Utilisation du mock pour le développement
      const students = await getElevesMock();
      return students.filter(student => student.status === status);
    } catch (error: any) {
      throw new Error(`Erreur lors du filtrage par statut: ${error.message}`);
    }
  }

  async getStudentsCount(): Promise<{ total: number; byStatus: Record<string, number> }> {
    try {
      // Utilisation du mock pour le développement
      const students = await getElevesMock();
      const byStatus = students.reduce((acc, student) => {
        acc[student.status] = (acc[student.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        total: students.length,
        byStatus
      };
    } catch (error: any) {
      throw new Error(`Erreur lors du comptage: ${error.message}`);
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