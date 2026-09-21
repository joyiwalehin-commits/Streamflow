import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Music, 
  Globe, 
  Sparkles, 
  Plus, 
  Send,
  Languages
} from 'lucide-react';
import { ShortVideo, UserProfile } from '../types';
import { SUPPORTED_LANGUAGES } from '../mockData';

interface FlowShortsFeedProps {
  shorts: ShortVideo[];
  currentUser: UserProfile;
  selectedLanguage: string;
  onLikeShort: (shortId: string) => void;
  onAddComment: (shortId: string, comment: string) => void;
  onOpenCreateShort: () => void;
}

export const FlowShortsFeed: React.FC<FlowShortsFeedProps> = ({
  shorts,
  currentUser,
  selectedLanguage,
  onLikeShort,
  onAddComment,
  onOpenCreateShort,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const activeShort = shorts[activeIndex] || shorts[0];
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const handleTranslateDescription = async (shortId: string, text: string) => {
    if (isTranslating) return;
    setIsTranslating(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: currentLangObj.name,
        }),
      });
      const data = await response.json();
      setTranslations(prev => ({
        ...prev,
        [shortId]: data.translation || text,
      }));
    } catch (err) {
      setTranslations(prev => ({
        ...prev,
        [shortId]: `[${currentLangObj.name}] ${text}`,
      }));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(activeShort.id, commentInput.trim());
    setCommentInput('');
  };

  return (
    <div id="flow-shorts-container" className="h-[calc(100vh-4.5rem)] flex items-center justify-center p-2 sm:p-4 bg-zinc-950">
      <div className="relative w-full max-w-sm sm:max-w-md h-full max-h-[820px] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
        {/* Video Canvas or Media Background */}
        <div className="relative flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center">
          {/* Simulated Short Video Loop Frame */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/60 via-zinc-900/80 to-rose-900/60 animate-pulse duration-1000">
            <img
              src={activeShort.creator.avatar}
              alt={activeShort.creator.name}
              className="w-full h-full object-cover filter blur-md opacity-30 transform scale-125"
            />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-500 shadow-2xl shadow-pink-500/50 mb-3 animate-bounce">
              <img
                src={activeShort.creator.avatar}
                alt={activeShort.creator.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="font-extrabold text-white text-lg">{activeShort.creator.name}</span>
            <span className="text-xs text-pink-400 font-semibold mb-2">{activeShort.creator.handle}</span>
            <span className="text-xs text-zinc-300 max-w-xs bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-700/50">
              Short Clip Preview: {activeShort.audioTitle}
            </span>
          </div>

          {/* Top Overlays: Navigation Arrows */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-zinc-700 text-xs font-bold text-white">
              Short {activeIndex + 1}/{shorts.length}
            </span>
            <button
              onClick={onOpenCreateShort}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold shadow-lg shadow-pink-900/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Short</span>
            </button>
          </div>

          {/* Right Action Bar (TikTok/Reels style) */}
          <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4">
            {/* Creator avatar with follow badge */}
            <div className="relative cursor-pointer group">
              <img
                src={activeShort.creator.avatar}
                alt={activeShort.creator.name}
                className="w-12 h-12 rounded-full border-2 border-pink-500 object-cover shadow-lg"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-600 rounded-full p-0.5 text-white shadow">
                <Plus className="w-3 h-3" />
              </span>
            </div>

            {/* Like */}
            <button
              onClick={() => onLikeShort(activeShort.id)}
              className="flex flex-col items-center gap-1 group active:scale-125 transition-transform"
            >
              <div className={`p-3 rounded-full backdrop-blur-md transition-all ${
                activeShort.isLiked ? 'bg-pink-600 text-white' : 'bg-black/50 text-white hover:bg-black/80'
              }`}>
                <Heart className={`w-6 h-6 ${activeShort.isLiked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-[11px] font-extrabold text-white drop-shadow">
                {activeShort.likes.toLocaleString()}
              </span>
            </button>

            {/* Comments toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-all">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-extrabold text-white drop-shadow">
                {activeShort.commentsCount.toLocaleString()}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={() => alert(`Shared "${activeShort.description.slice(0, 30)}..." to social networks!`)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-all">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-extrabold text-white drop-shadow">
                {activeShort.shares.toLocaleString()}
              </span>
            </button>
          </div>

          {/* Bottom Info: Creator, Description, Tags, Music, Translation */}
          <div className="absolute left-4 right-16 bottom-4 z-20 text-white drop-shadow-md">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-extrabold text-sm">{activeShort.creator.name}</span>
              <span className="text-xs text-zinc-300">{activeShort.creator.countryFlag}</span>
              <span className="text-[10px] bg-pink-500/80 px-1.5 py-0.5 rounded font-bold">Creator</span>
            </div>

            {/* Description & Auto-Translate */}
            <div className="mb-2">
              <p className="text-xs text-zinc-100 leading-snug line-clamp-3">
                {translations[activeShort.id] || activeShort.description}
              </p>

              {/* Translation Trigger */}
              <button
                onClick={() => handleTranslateDescription(activeShort.id, activeShort.description)}
                disabled={isTranslating}
                className="mt-1 flex items-center gap-1 text-[11px] text-pink-400 font-bold hover:underline"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>
                  {translations[activeShort.id]
                    ? 'Showing AI Translation'
                    : `Translate to ${currentLangObj.name}`}
                </span>
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeShort.tags.map((tag) => (
                <span key={tag} className="text-[11px] text-pink-300 font-semibold">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Audio track info */}
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Music className="w-3.5 h-3.5 text-pink-400 animate-spin-slow" />
              <span className="truncate">{activeShort.audioTitle}</span>
            </div>
          </div>
        </div>

        {/* Vertical Swipe Navigation Bar */}
        <div className="bg-zinc-950 p-2.5 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-400">
          <button
            onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30 hover:text-white"
          >
            ▲ Previous Short
          </button>
          <span className="text-[11px] text-zinc-500">Swipe or Click</span>
          <button
            onClick={() => setActiveIndex(prev => Math.min(shorts.length - 1, prev + 1))}
            disabled={activeIndex === shorts.length - 1}
            className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30 hover:text-white"
          >
            ▼ Next Short
          </button>
        </div>
      </div>
    </div>
  );
};
