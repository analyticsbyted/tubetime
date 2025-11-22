'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Youtube, Star, ChevronDown, LogIn, LogOut, FileText } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';

// A new sub-component to handle the authentication display
function AuthButton() {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Check for OAuth callback and refresh session
  useEffect(() => {
    // If we're on a page that might be returning from OAuth, refresh session
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      // Check if we have callback parameters or if we just came back from OAuth
      if (urlParams.has('callbackUrl') || window.location.pathname.includes('callback')) {
        // Small delay to ensure OAuth callback has completed
        const timer = setTimeout(() => {
          // Force a session check by triggering a window focus event
          window.dispatchEvent(new Event('focus'));
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (status === 'loading') {
    return <div className="w-24 h-8 bg-zinc-800 rounded-full animate-pulse" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {session.user.image && (
            <img src={session.user.image} alt={session.user.name} className="w-6 h-6 rounded-full" />
          )}
          <span className="hidden sm:inline text-zinc-300">{session.user.name}</span>
        </div>
        <button
          onClick={async () => {
            // Clear all localStorage data on sign out for security
            // This prevents other users on the same browser from seeing user data
            // Also clears any legacy keys from migration period
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                const keysToRemove = [
                  'tubetime_favorites',
                  'tubetime_search_history',
                  'tubetime_transcription_queue',
                  'tubetime_collections', // Legacy key (if it exists)
                ];
                
                keysToRemove.forEach(key => {
                  try {
                    localStorage.removeItem(key);
                  } catch (error) {
                    // Silently handle individual key removal errors
                  }
                });
              }
            } catch (error) {
              // Silently handle localStorage errors
            }
            await signOut();
          }}
          className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/50 transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3 h-3" />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-xs px-3 py-1.5 rounded-full border border-red-600/50 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:border-red-500 hover:text-red-300 transition-colors flex items-center gap-1.5 font-medium"
        title="Sign in"
      >
        <LogIn className="w-3 h-3" />
        <span className="hidden sm:inline">Sign In</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="py-1">
            <button
              onClick={() => {
                setShowMenu(false);
                signIn('google', { callbackUrl: window.location.href });
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                signIn('github', { callbackUrl: window.location.href });
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default function Header({ selectedCount, onOpenFavorites }) {
  const pathname = usePathname();
  const isTranscriptsPage = pathname === '/transcripts';

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <Youtube className="w-6 h-6 text-zinc-100 fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
              Tube<span className="text-red-500">Time</span>
            </h1>
          </Link>
          {selectedCount > 0 && (
            <span className="text-xs text-zinc-400 font-mono ml-2">
              ({selectedCount} selected)
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/transcripts"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${
              isTranscriptsPage
                ? 'border-red-500 text-red-400 bg-red-500/10'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
            title="My Transcripts"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">Transcripts</span>
          </Link>
          <button
            onClick={onOpenFavorites}
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors flex items-center gap-2"
            title="Favorites"
          >
            <Star className="w-3 h-3" />
            <span className="hidden sm:inline">Favorites</span>
          </button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}