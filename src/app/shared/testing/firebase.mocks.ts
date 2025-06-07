export function createAuthStub() {
  return {
    signInAnonymously: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  } as unknown as {
    signInAnonymously: (...args: any[]) => Promise<any>;
    signInWithEmailAndPassword: (...args: any[]) => Promise<any>;
    signInWithPopup: (...args: any[]) => Promise<any>;
    signOut: () => Promise<void>;
    onAuthStateChanged: (...args: any[]) => () => void;
  };
}

export function createFirestoreServiceMock() {
  return {
    getDocByPath: jest.fn(),
    getDocsWhere: jest.fn(),
    addDocToCollection: jest.fn(),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
  } as unknown as {
    getDocByPath: (...args: any[]) => Promise<any>;
    getDocsWhere: (...args: any[]) => Promise<any>;
    addDocToCollection: (...args: any[]) => Promise<any>;
    updateDoc: (...args: any[]) => Promise<any>;
    setDoc: (...args: any[]) => Promise<any>;
  };
}
