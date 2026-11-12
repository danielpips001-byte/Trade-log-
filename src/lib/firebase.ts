import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDocFromServer,
  Firestore 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with ignoreUndefinedProperties to prevent undefined field crashes
export const db: Firestore = initializeFirestore(
  app, 
  { ignoreUndefinedProperties: true }, 
  firebaseConfig.firestoreDatabaseId
);

/**
 * Sanitizes an object before writing to Firestore, ensuring undefined keys are stripped
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline. Operating with local fallback.');
      return false;
    }
    return true;
  }
}
