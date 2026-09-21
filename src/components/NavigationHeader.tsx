import React, { useState } from 'react';
import { 
  Radio, 
  Flame, 
  Film, 
  Compass, 
  Coins, 
  Gem, 
  Globe, 
  ShieldCheck, 
  FileSpreadsheet, 
  LogOut,
  User,
  Plus
} from 'lucide-react';
import { UserProfile } from '../types';
import { SUPPORTED_LANGUAGES } from '../mockData';

interface NavigationHeaderProps {
  currentUser: UserProfile;
  currentTab: 'live' | 'shorts' | 'discover' | 'creator-studio' | 'buy-coins' | 'creator-wallet';
  onSelectTab: (tab: 'live' | 'shorts' | 'discover' | 'creator-studio' | 'buy-coins' | 'creator-wallet') => void;
  onGoLiveClick: () => void;
  selectedLanguage: string;
  onSelectLanguage: (langCode: string) => void;
  isSheetsConnected: boolean;
  onSheetsClick: () => void;
  onOpenWallet: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentUser,
  currentTab,
  onSelectTab,
  onGoLiveClick,
  selectedLanguage,
  onSelectLanguage,
  isSheetsConnected,
  onSheetsClick,
  onOpenWallet,
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <header id="streamflow-header" className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onSelectTab('live')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 p-0.5 shadow-lg shadow-pink-600/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-pink-500 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  StreamFlow
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  GLOBAL
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Real-time Live & PK Arena</p>
            </div>
          </div>

          {/* Navigation Pill Menu */}
          <nav className="hidden md:flex items-center gap-1 ml-6 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl">
            <button
              id="nav-tab-live"
              onClick={() => onSelectTab('live')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'live'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Flame className="w-4 h-4" />
              Live Streams
            </button>
            <button
              id="nav-tab-shorts"
              onClick={() => onSelectTab('shorts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'shorts'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Film className="w-4 h-4" />
              FlowShorts
            </button>
            <button
              id="nav-tab-discover"
              onClick={() => onSelectTab('discover')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'discover'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              Explore PK
            </button>
            <button
              id="nav-tab-creator-studio"
              onClick={() => onSelectTab('creator-studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'creator-studio'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Creator Analytics
            </button>
            <button
              id="nav-tab-creator-wallet"
              onClick={() => onSelectTab('creator-wallet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'creator-wallet'
                  ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white font-extrabold shadow-md shadow-pink-900/40'
                  : 'text-pink-400/90 hover:text-pink-300 hover:bg-pink-500/10 border border-pink-500/20'
              }`}
            >
              <Gem className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>Creator Wallet</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1 rounded font-mono font-bold">₦ Payout</span>
            </button>
            <button
              id="nav-tab-buy-coins"
              onClick={() => onSelectTab('buy-coins')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'buy-coins'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold shadow-md shadow-amber-900/40'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              <Coins className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <span>Buy Coins</span>
              <span className="text-[10px] bg-black/40 text-amber-300 px-1 rounded font-mono">₦</span>
            </button>
          </nav>
        </div>

        {/* Right Controls: Go Live, Translation Lang, Wallet, Profile */}
        <div className="flex items-center gap-2.5">
          {/* Real-time Translation Language Switcher */}
          <div className="relative">
            <button
              id="lang-selector-btn"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800/60"
              title="Global Live Auto-Translation Target"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentLangObj.flag}</span>
              <span className="hidden sm:inline">{currentLangObj.code.toUpperCase()}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 flex items-center justify-between">
                  <span>Chat Auto-Translate</span>
                  <span className="text-emerald-400">Gemini AI</span>
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                      lang.code === selectedLanguage ? 'text-pink-400 font-bold bg-pink-500/10' : 'text-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {lang.code === selectedLanguage && <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visible Buy Coins Button (Mobile & Desktop) */}
          <button
            id="visible-buy-coins-btn"
            onClick={() => onSelectTab('buy-coins')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
              currentTab === 'buy-coins'
                ? 'bg-amber-400 text-black ring-2 ring-amber-300'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-amber-950/30 hover:scale-[1.03] active:scale-[0.97]'
            }`}
            title="Buy StreamFlow Coins in Nigerian Naira (₦)"
          >
            <Coins className="w-3.5 h-3.5 fill-black stroke-black shrink-0" />
            <span className="font-extrabold">Buy Coins</span>
            <span className="text-[10px] bg-black/20 text-black px-1 rounded font-mono font-black">₦</span>
          </button>

          {/* Virtual Coins / Wallet Balance */}
          <button
            id="wallet-btn"
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all shadow-sm"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>{currentUser.coins.toLocaleString()}</span>
            <Plus className="w-3 h-3 text-amber-400" />
          </button>

          {/* Google Sheets Status Link */}
          <button
            id="sheets-sync-btn"
            onClick={onSheetsClick}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isSheetsConnected
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/30'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-zinc-700'
            }`}
            title="Google Sheets Auto-Sync Stream Logs"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isSheetsConnected ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">{isSheetsConnected ? 'Sheets Linked' : 'Connect Sheets'}</span>
          </button>

          {/* Go Live Action Button */}
          <button
            id="btn-go-live"
            onClick={onGoLiveClick}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-pink-600/30 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse text-white" />
            <span>Go Live</span>
          </button>

          {/* User Avatar - Creator Earnings Profile */}
          <div 
            onClick={() => onSelectTab('creator-wallet')}
            title="Open Creator Wallet & Earnings"
            className="relative group cursor-pointer"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-zinc-700 group-hover:ring-pink-500 transition-all"
            />
            <span className="absolute -bottom-1 -right-1 text-[10px] bg-zinc-900 rounded-full px-1 border border-zinc-700 text-pink-400 font-bold">
              💎
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
