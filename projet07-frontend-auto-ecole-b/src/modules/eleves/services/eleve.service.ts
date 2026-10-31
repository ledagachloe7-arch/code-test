// Service des élèves avec mocks
import { Student, Document, StudentFormData } from '../types/student';

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
    status: 'complete',
    documentsCount: 4,
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
];

// Mock des documents
const mockDocuments: Document[] = [
  {
    id: '1',
    studentId: '1',
    type: 'identity',
    name: 'Carte d\'identité',
    url: '/documents/identity-1.pdf',
    size: '2.5 MB',
    uploadedAt: '2024-01-16T09:30:00Z',
    status: 'uploaded',
  },
  {
    id: '2',
    studentId: '1',
    type: 'photo',
    name: 'Photo d\'identité',
    url: '/documents/photo-1.jpg',
    size: '1.2 MB',
    uploadedAt: '2024-01-16T10:15:00Z',
    status: 'uploaded',
  },
];

// Mock de la récupération des élèves
export async function getElevesMock(): Promise<Student[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockStudents);
    }, 600);
  });
}

// Mock de la récupération d'un élève par ID
export async function getEleveByIdMock(id: string): Promise<Student> {
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

// Mock de la création d'un élève
export async function createEleveMock(studentData: StudentFormData): Promise<Student> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newStudent: Student = {
        id: (mockStudents.length + 1).toString(),
        ...studentData,
        status: 'incomplete',
        documentsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStudents.push(newStudent);
      resolve(newStudent);
    }, 800);
  });
}

// Mock de la mise à jour d'un élève
export async function updateEleveMock(id: string, studentData: Partial<StudentFormData>): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const studentIndex = mockStudents.findIndex(s => s.id === id);
      if (studentIndex !== -1) {
        mockStudents[studentIndex] = {
          ...mockStudents[studentIndex],
          ...studentData,
          updatedAt: new Date(),
        };
        resolve(mockStudents[studentIndex]);
      } else {
        reject(new Error('Élève non trouvé'));
      }
    }, 500);
  });
}

// Mock de la suppression d'un élève
export async function deleteEleveMock(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const studentIndex = mockStudents.findIndex(s => s.id === id);
      if (studentIndex !== -1) {
        mockStudents.splice(studentIndex, 1);
        resolve();
      } else {
        reject(new Error('Élève non trouvé'));
      }
    }, 400);
  });
}

// Mock de l'upload de document
export async function uploadDocumentMock(
  studentId: string, 
  file: File, 
  type: string
): Promise<Document> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newDocument: Document = {
        id: (mockDocuments.length + 1).toString(),
        type: type as any,
        name: file.name,
        url: `/documents/${file.name}`,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
      };
      mockDocuments.push(newDocument);
      resolve(newDocument);
    }, 1000);
  });
}

// Mock de la récupération des documents d'un élève
export async function getStudentDocumentsMock(studentId: string): Promise<Document[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const documents = mockDocuments.filter(d => d.studentId === studentId);
      resolve(documents);
    }, 300);
  });
}

// Version API future (préparée mais commentée)
// export async function getEleves(): Promise<Student[]> {
//   const { data } = await axios.get("/eleves");
//   return data;
// }

// export async function createEleve(studentData: StudentFormData): Promise<Student> {
//   const { data } = await axios.post("/eleves", studentData);
//   return data;
// }

// export async function uploadDocument(studentId: string, file: File, type: string): Promise<Document> {
//   const formData = new FormData();
//   formData.append('file', file);
//   formData.append('type', type);
//   formData.append('studentId', studentId);
//   const { data } = await axios.post("/documents/upload", formData);
//   return data;
// }
