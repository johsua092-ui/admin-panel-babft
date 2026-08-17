// Type declarations for Firebase client SDK modules
// (firebase v10+ ships ESM without bundled .d.ts — this satisfies TypeScript)
// We use loose typings here since the actual runtime behavior is verified by Firebase SDK.

declare module "firebase/app" {
  export interface FirebaseApp {
    name: string;
    options: Record<string, any>;
    automaticDataCollectionEnabled: boolean;
  }
  export function initializeApp(config: Record<string, any>, name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
  export function deleteApp(app: FirebaseApp): Promise<void>;
}

declare module "firebase/auth" {
  import { FirebaseApp } from "firebase/app";
  export interface Auth { app: FirebaseApp; }
  export interface User {
    uid: string; email: string | null; displayName: string | null; photoURL: string | null;
    getIdToken(forceRefresh?: boolean): Promise<string>;
    getIdTokenResult(forceRefresh?: boolean): Promise<any>;
  }
  export interface UserCredential { user: User; }
  export function getAuth(app: FirebaseApp): Auth;
  export class GoogleAuthProvider { addScope(scope: string): this; setCustomParameters(params: Record<string, string>): this; static PROVIDER_ID: string; }
  export function signInWithPopup(auth: Auth, provider: any): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, next: (user: User | null) => void, error?: (err: any) => void, completed?: () => void): () => void;
  export type AuthProvider = any;
}

declare module "firebase/firestore" {
  import { FirebaseApp } from "firebase/app";
  export interface Firestore { app: FirebaseApp; }
  export interface DocumentReference { id: string; path: string; parent: CollectionReference; }
  export interface CollectionReference { id: string; path: string; }
  export interface DocumentSnapshot { exists: boolean; id: string; ref: DocumentReference; data(): Record<string, any> | undefined; }
  export interface QuerySnapshot { docs: QueryDocumentSnapshot[]; empty: boolean; size: number; }
  export interface QueryDocumentSnapshot extends DocumentSnapshot { data(): Record<string, any>; }
  export function getFirestore(app: FirebaseApp): Firestore;
  export function doc(db: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function collection(db: Firestore, path: string, ...pathSegments: string[]): CollectionReference;
  export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot>;
  export function getDocs(query: any): Promise<QuerySnapshot>;
  export function setDoc(ref: DocumentReference, data: any, options?: { merge?: boolean }): Promise<void>;
  export function updateDoc(ref: DocumentReference, data: any): Promise<void>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function onSnapshot(ref: any, callback: (snap: any) => void): () => void;
  export function query(collectionRef: any, ...constraints: any[]): any;
  export function where(field: string, op: string, value: any): any;
  export function orderBy(field: string, direction?: string): any;
  export function limit(n: number): any;
  export type FirestoreError = { code: string; message: string; };
}
