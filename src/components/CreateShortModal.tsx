import React, { useState } from 'react';
import { 
  Film, 
  Upload, 
  Sparkles, 
  Music, 
  Tag, 
  Globe, 
  X,
  FileVideo
} from 'lucide-react';
import { UserProfile, ShortVideo } from '../types';

interface CreateShortModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreateShort: (short: ShortVideo) => void;
}

export const CreateShortModal: React.FC<CreateShortModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateShort,
}) => {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('StreamFlow,GlobalVibes,Creator');
  const [audioTitle, setAudioTitle] = useState('Viral Beats - Cyber Beat 2026');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newShort: ShortVideo = {
      id: `short_${Date.now()}`,
      creator: currentUser,
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      audioTitle: audioTitle.trim() || 'Original Sound - ' + currentUser.name,
      likes: 1,
      commentsCount: 0,
      shares: 0,
      originalLanguage: 'English',
    };

    onCreateShort(newShort);
    onClose();
  };

  return (
    <div id="create-short-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 text-zinc-100 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Create FlowShort Video</h3>
              <p className="text-xs text-zinc-400">Share quick moments with automatic translation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Video Drag/Drop or Select Area */}
          <div className="border-2 border-dashed border-zinc-800 hover:border-pink-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-zinc-900/40 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-pink-500 mb-2" />
            <span className="text-xs font-bold text-zinc-200">Tap or drag 15-60s clip to upload</span>
            <span className="text-[10px] text-zinc-500 mt-1">MP4, WebM or MOV up to 100MB</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Caption / Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening? Describe your short video for global viewers..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Audio Track</label>
              <input
                type="text"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-pink-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-pink-600/30 transition-all"
          >
            Post FlowShort Now ✨
          </button>
        </form>
      </div>
    </div>
  );
};
