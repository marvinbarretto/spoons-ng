// Mock for Firebase Auth
export function createAuthMock() {
  return {
    signInAnonymously: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    currentUser: null,
  };
}

// Mock for Firebase Firestore
export function createFirestoreMock() {
  return {
    doc: jest.fn(),
    collection: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  };
}

// Mock for FirebaseMetricsService
export function createFirebaseMetricsMock() {
  return {
    trackCall: jest.fn(),
    resetSession: jest.fn(),
    logSessionInfo: jest.fn(),
    getCallCount: jest.fn().mockReturnValue(0),
    getReadCount: jest.fn().mockReturnValue(0),
    getWriteCount: jest.fn().mockReturnValue(0),
  };
}

// Legacy function - kept for backward compatibility
export function createAuthStub() {
  return createAuthMock();
}

// Legacy function - kept for backward compatibility
export function createFirestoreServiceMock() {
  return {
    getDocByPath: jest.fn(),
    getDocsWhere: jest.fn(),
    addDocToCollection: jest.fn(),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
  };
}
