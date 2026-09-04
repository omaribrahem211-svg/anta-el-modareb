import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache, 
  setLogLevel 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore network retry warnings for quota limits
setLogLevel('silent');

// Initialize or reuse Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider configured for popups
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configure robust persistent local cache with multi-tab support
let cacheConfig;
try {
  cacheConfig = persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  });
} catch {
  cacheConfig = memoryLocalCache();
}

// Initialize Firestore with configured databaseId and local persistent cache
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    localCache: cacheConfig
  },
  firebaseConfig.firestoreDatabaseId || undefined
);

export default app;


