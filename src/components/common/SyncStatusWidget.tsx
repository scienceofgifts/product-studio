/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  User as UserIcon,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  X
} from 'lucide-react';
import { syncService, SyncState } from '../../services/syncService';
import { signInWithGoogle, logoutUser, getAuthorizedDomainInfo } from '../../services/firebase';

interface SyncStatusWidgetProps {
  compact?: boolean;
}

interface AuthErrorDetails {
  title: string;
  description: string;
  isUnauthorizedDomain: boolean;
  domain: string;
  projectId: string;
  consoleUrl: string;
}

export const SyncStatusWidget: React.FC<SyncStatusWidgetProps> = ({ compact = false }) => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const domainInfo = getAuthorizedDomainInfo();

  useEffect(() => {
    const unsub = syncService.subscribeState((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const handleCopyDomain = (domainToCopy: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(domainToCopy).then(() => {
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2500);
      });
    }
  };

  const handleSignIn = async () => {
    try {
      setIsAuthorizing(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const isUnauthDomain =
        err?.code === 'auth/unauthorized-domain' ||
        String(err?.message || err).includes('unauthorized-domain');

      if (isUnauthDomain) {
        setAuthError({
          title: 'Firebase Authorized Domain Required',
          description: `Firebase Authentication requires every domain that initiates Google Sign-In to be allowlisted in the Firebase Console.`,
          isUnauthorizedDomain: true,
          domain: domainInfo.domain,
          projectId: domainInfo.projectId,
          consoleUrl: domainInfo.consoleUrl
        });
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError({
          title: 'Sign-In Popup Blocked',
          description: 'Your browser blocked the Google Sign-In window. Please allow popups for this site and try again.',
          isUnauthorizedDomain: false,
          domain: domainInfo.domain,
          projectId: domainInfo.projectId,
          consoleUrl: domainInfo.consoleUrl
        });
      } else if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setAuthError({
          title: 'Sign-In Failed',
          description: err?.message || 'An unexpected error occurred while attempting to sign in with Google.',
          isUnauthorizedDomain: false,
          domain: domainInfo.domain,
          projectId: domainInfo.projectId,
          consoleUrl: domainInfo.consoleUrl
        });
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setAuthError(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleManualSync = () => {
    syncService.triggerManualSync();
  };

  const renderAuthErrorModal = () => {
    if (!authError) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full p-6 text-stone-900 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 leading-tight">
                  {authError.title}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Firebase Project: <span className="font-mono font-medium text-stone-700">{authError.projectId}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            {authError.description}
          </p>

          {authError.isUnauthorizedDomain && (
            <div className="space-y-3 bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs">
              <div>
                <span className="font-semibold text-stone-800 block mb-1">Current Preview Domain:</span>
                <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded border border-stone-200 font-mono text-stone-800 text-[11px] select-all">
                  <span className="truncate">{authError.domain}</span>
                  <button
                    onClick={() => handleCopyDomain(authError.domain)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[11px] font-sans font-medium transition-colors shrink-0"
                    title="Copy domain to clipboard"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-stone-600 leading-relaxed">
                <span className="font-semibold text-stone-800 block">How to enable in 4 clicks:</span>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Click <span className="font-medium text-stone-800">Open Firebase Settings</span> below.</li>
                  <li>Scroll to the <span className="font-medium text-stone-800">Authorized domains</span> section and click <span className="font-medium text-stone-800">Add domain</span>.</li>
                  <li>Paste the copied domain (<span className="font-mono text-stone-700">{authError.domain}</span>) and click <span className="font-medium text-stone-800">Save</span>.</li>
                  <li>Return here and click <span className="font-medium text-stone-800">Sign In</span> again.</li>
                </ol>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <a
                  href={authError.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors"
                >
                  <span>Open Firebase Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Local workspace remains 100% functional</span>
              <span>All product drafts, analyses, and gift guides are stored locally in IndexedDB and work immediately without signing in.</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setAuthError(null)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5 text-xs">
          {syncState.currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2 bg-stone-100/80 px-1.5 sm:px-2.5 py-1 rounded-full border border-stone-200">
              {syncState.status === 'syncing' && (
                <span className="flex items-center gap-1 text-blue-700 font-medium whitespace-nowrap shrink-0">
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  <span className="hidden min-[380px]:inline">Syncing</span>
                </span>
              )}
              {syncState.status === 'synced' && (
                <span className="flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap shrink-0" title="Editorial Rules & styles synchronized with Cloud Firestore">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="hidden min-[380px]:inline">Synced</span>
                </span>
              )}
              {syncState.status === 'offline' && (
                <span className="flex items-center gap-1 text-amber-700 font-medium whitespace-nowrap shrink-0" title="Offline mode active. All changes saved locally in IndexedDB">
                  <WifiOff className="w-3 h-3 shrink-0" />
                  <span className="hidden min-[380px]:inline">Offline</span>
                </span>
              )}
              {syncState.status === 'error' && (
                <span className="flex items-center gap-1 text-red-700 font-medium whitespace-nowrap shrink-0" title={syncState.errorMessage || 'Sync error'}>
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="hidden min-[380px]:inline">Sync Error</span>
                </span>
              )}
              {syncState.status === 'idle' && (
                <span className="flex items-center gap-1 text-stone-600 font-medium whitespace-nowrap shrink-0">
                  <Cloud className="w-3 h-3 shrink-0" />
                  <span className="hidden min-[380px]:inline">Ready</span>
                </span>
              )}

              <button
                onClick={handleManualSync}
                disabled={syncState.status === 'syncing' || !syncState.isOnline}
                className="p-0.5 hover:text-stone-900 text-stone-500 rounded transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                title="Manual Sync Now"
              >
                <RefreshCw className="w-3 h-3" />
              </button>

              <span className="w-px h-3 bg-stone-300 mx-0.5 shrink-0" />

              <div className="flex items-center gap-1 sm:gap-1.5 text-stone-700 font-medium max-w-[50px] min-[380px]:max-w-[80px] sm:max-w-[120px] truncate shrink" title={syncState.currentUser.email || ''}>
                {syncState.currentUser.photoURL ? (
                  <img src={syncState.currentUser.photoURL} alt="User Avatar" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                )}
                <span className="truncate">{syncState.currentUser.displayName?.split(' ')[0] || syncState.currentUser.email?.split('@')[0]}</span>
              </div>

              <button
                onClick={handleSignOut}
                className="p-0.5 text-stone-400 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isAuthorizing}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Sign in with Google to sync Editorial Rules"
            >
              <LogIn className="w-3 h-3 text-[#1E3A8A] shrink-0" />
              <span>{isAuthorizing ? 'Signing in...' : 'Sign In'}<span className="hidden sm:inline"> to Sync</span></span>
            </button>
          )}
        </div>
        {renderAuthErrorModal()}
      </>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-stone-800 space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#1E3A8A]" />
            <h4 className="font-semibold text-sm text-stone-900">Cloud Firestore Synchronization</h4>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-blue-100 text-[#1E3A8A]">
              Editorial Rules
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 max-w-xl">
            Synchronizes your canonical <span className="font-medium text-stone-900">Editorial Rules</span> across devices using Firebase. All products, mockups, and working drafts remain stored safely in your local browser cache (IndexedDB).
          </p>
        </div>


        <div>
          {syncState.currentUser ? (
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-stone-200 shadow-xs">
                {syncState.currentUser.photoURL ? (
                  <img src={syncState.currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-stone-500" />
                )}
                <span className="text-xs font-medium text-stone-800">{syncState.currentUser.email}</span>
                <button
                  onClick={handleSignOut}
                  className="ml-2 px-2 py-1 text-xs font-medium text-stone-600 hover:text-red-600 hover:bg-stone-100 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500">Status:</span>
                {syncState.status === 'synced' && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                  </span>
                )}
                {syncState.status === 'syncing' && (
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
                  </span>
                )}
                {syncState.status === 'offline' && (
                  <span className="flex items-center gap-1 font-semibold text-amber-700">
                    <WifiOff className="w-3.5 h-3.5" /> Offline Mode
                  </span>
                )}
                {syncState.status === 'error' && (
                  <span className="flex items-center gap-1 font-semibold text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" /> Sync Error
                  </span>
                )}

                <button
                  onClick={handleManualSync}
                  disabled={syncState.status === 'syncing' || !syncState.isOnline}
                  className="flex items-center gap-1 ml-2 px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-medium rounded transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isAuthorizing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAuthorizing ? 'Signing in...' : 'Sign In with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Domain info reminder when not signed in */}
      {!syncState.currentUser && (
        <div className="p-2.5 bg-stone-100/80 rounded border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-stone-500 shrink-0" />
            <span>
              Google Sign-In requires domain <span className="font-mono font-medium text-stone-800">{domainInfo.domain}</span> to be added to Firebase Authorized Domains.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => handleCopyDomain(domainInfo.domain)}
              className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-stone-200 border border-stone-200 rounded text-stone-700 font-medium transition-colors"
            >
              {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={domainInfo.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#1E3A8A] hover:underline font-medium"
            >
              <span>Firebase Settings</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {syncState.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncState.errorMessage}</span>
        </div>
      )}

      {renderAuthErrorModal()}
    </div>
  );
};
