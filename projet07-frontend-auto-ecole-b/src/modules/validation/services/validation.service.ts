// Service de validation avec mocks
import { Student, ValidationHistoryEntry } from '../types';

// Mock des élèves
const mockStudents: Student[] = [
  {
    id: '1',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@email.com',
    phone: '0612345678',
    address: '123 Rue de la Paix, 75001 Paris',
    birthDate: '1990-05-15',
    nationality: 'Française',
    status: 'pending',
    documentsCount: 3,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    firstName: 'Jean',
    lastName: 'Ngoma',
    email: 'jean.ngoma@email.com',
    phone: '0698765432',
    address: '456 Avenue des Champs, 75008 Paris',
    birthDate: '1988-12-03',
    nationality: 'Française',
    status: 'validated',
    documentsCount: 4,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@email.com',
    phone: '0654321098',
    address: '789 Boulevard Saint-Germain, 75006 Paris',
    birthDate: '1992-08-22',
    nationality: 'Française',
    status: 'rejected',
    documentsCount: 2,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-19'),
  },
];

// Mock de l'historique de validation
const mockHistory: ValidationHistoryEntry[] = [
  {
    id: '1',
    studentId: '2',
    action: 'validated',
    reason: 'Dossier complet et conforme',
    validatedBy: 'admin@dgtt.com',
    validatedAt: '2024-01-18T10:30:00Z',
  },
  {
    id: '2',
    studentId: '3',
    action: 'rejected',
    reason: 'Documents manquants',
    validatedBy: 'admin@dgtt.com',
    validatedAt: '2024-01-19T14:15:00Z',
  },
];

// Mock de la récupération des élèves
export async function getStudentsMock(): Promise<Student[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockStudents);
    }, 600);
  });
}

// Mock de la validation d'un élève
export async function validateStudentMock(studentId: string, reason?: string): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const student = mockStudents.find(s => s.id === studentId);
      if (student) {
        student.status = 'validated';
        student.updatedAt = new Date();
        resolve(student);
      } else {
        reject(new Error('Élève non trouvé'));
      }
    }, 500);
  });
}

// Mock du rejet d'un élève
export async function rejectStudentMock(studentId: string, reason: string): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const student = mockStudents.find(s => s.id === studentId);
      if (student) {
        student.status = 'rejected';
        student.updatedAt = new Date();
        resolve(student);
      } else {
        reject(new Error('Élève non trouvé'));
      }
    }, 500);
  });
}

// Mock de la récupération de l'historique
export async function getValidationHistoryMock(): Promise<ValidationHistoryEntry[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockHistory);
    }, 400);
  });
}

// Mock de la récupération d'un élève par ID
export async function getStudentByIdMock(id: string): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const student = mockStudents.find(s => s.id === id);
      if (student) {
        resolve(student);
      } else {
        reject(new Error('Élève non trouvé'));
      }
    }, 300);
  });
}

// Version API future (préparée mais commentée)
// export async function getStudents(): Promise<Student[]> {
//   const { data } = await axios.get("/validation/students");
//   return data;
// }

// export async function validateStudent(studentId: string, reason?: string): Promise<Student> {
//   const { data } = await axios.post("/validation/validate", { studentId, reason });
//   return data;
// }

// export async function rejectStudent(studentId: string, reason: string): Promise<Student> {
//   const { data } = await axios.post("/validation/reject", { studentId, reason });
//   return data;
// }
