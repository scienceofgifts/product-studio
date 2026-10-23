/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Google Sign-In helper using signInWithPopup
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    if (error && (error.code === 'auth/unauthorized-domain' || String(error?.message).includes('unauthorized-domain'))) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const projectId = firebaseConfig.projectId;
      error.customDetails = {
        domain: hostname,
        projectId,
        consoleUrl: `https://console.firebase.google.com/project/${projectId}/authentication/settings`
      };
    }
    throw error;
  }
}

export function getAuthorizedDomainInfo() {
  const domain = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = firebaseConfig.projectId;
  return {
    domain,
    projectId,
    consoleUrl: `https://console.firebase.google.com/project/${projectId}/authentication/settings`
  };
}

// Sign out helper
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Validate connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or network unavailable.');
    }
    return false;
  }
}

// Helper to determine if an error is due to offline status or temporary network/token unavailability
export function isFirestoreOfflineError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return (
    code === 'unavailable' ||
    code === 'auth/network-request-failed' ||
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('the client is offline') ||
    msg.includes('token-service-api-has-not-been-used') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('network-request-failed') ||
    msg.includes('Failed to fetch')
  );
}

// Operation type enum for error tracking
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
    },
  };
  if (isFirestoreOfflineError(error)) {
    console.warn(`[Firestore Offline] ${operationType} on ${path}: ${errInfo.error}`);
  } else {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

