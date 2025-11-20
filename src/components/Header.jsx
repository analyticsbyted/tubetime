'use client';

import React from 'react';
import { Youtube, Star } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';

// A new sub-component to handle the authentication display
function AuthButton() {
  const { data: session, status } = useSession();

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
          onClick={() => signOut()}
          className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => signIn('google')}
        className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
        title="Sign in with Google"
      >
        <span className="hidden sm:inline">Sign In with </span>Google
      </button>
      <button
        onClick={() => signIn('github')}
        className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
        title="Sign in with GitHub"
      >
        <span className="hidden sm:inline">Sign In with </span>GitHub
      </button>
    </div>
  );
}


export default function Header({ selectedCount, onOpenFavorites }) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg">
            <Youtube className="w-6 h-6 text-white fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">
            Tube<span className="text-red-500">Time</span>
          </h1>
          {selectedCount > 0 && (
            <span className="text-xs text-zinc-400 font-mono ml-2">
              ({selectedCount} selected)
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
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