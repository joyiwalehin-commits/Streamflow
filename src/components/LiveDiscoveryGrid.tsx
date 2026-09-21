import React from 'react';
import { Flame, Swords, Lock, Users, Radio, Tag, Play, Coins, Plus, Video } from 'lucide-react';
import { StreamSession } from '../types';

interface LiveDiscoveryGridProps {
  streams: StreamSession[];
  onSelectStream: (stream: StreamSession) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenBuyCoins?: () => void;
  onOpenGoLive?: () => void;
}

const CATEGORIES = ['All', 'Music & Dance', 'Gaming', 'ChitChat', 'Cooking', 'Fitness', 'Cosplay'];

export const LiveDiscoveryGrid: React.FC<LiveDiscoveryGridProps> = ({
  streams,
  onSelectStream,
  selectedCategory,
  onSelectCategory,
  onOpenBuyCoins,
  onOpenGoLive,
}) => {
  const activeLiveStreams = streams.filter((s) => s.isLive !== false);
  const filteredStreams = selectedCategory === 'All' 
    ? activeLiveStreams 
    : activeLiveStreams.filter((s) => s.category === selectedCategory);

  return (
    <div id="live-discovery-grid" className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Category Filter Chips & Go Live Trigger */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-900/30'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {onOpenGoLive && (
          <button
            onClick={onOpenGoLive}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-extrabold shrink-0 shadow-lg shadow-rose-950/40 active:scale-95 transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Go Live</span>
          </button>
        )}
      </div>

      {/* Visible Buy Coins Banner (Paystack NGN Store) */}
      {onOpenBuyCoins && (
        <div 
          id="discovery-buy-coins-banner"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-500/10 border border-amber-500/30 shadow-lg"
        >
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">Recharge StreamFlow Coins</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Paystack NGN (₦)
                </span>
              </div>
              <p className="text-xs text-zinc-400">Unlock VIP streams, PK Battle boosts & virtual gifts with instant Paystack checkout</p>
            </div>
          </div>
          <button
            id="discovery-buy-coins-btn"
            onClick={onOpenBuyCoins}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Coins className="w-4 h-4 fill-black" />
            <span>Buy Coins Now</span>
          </button>
        </div>
      )}

      {/* Streams Grid or Empty State */}
      {filteredStreams.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/50 border border-zinc-800">
          <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-zinc-500">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-white">No active live streams in {selectedCategory}</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Be the first creator to broadcast in this category or switch back to All categories.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onSelectCategory('All')}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
            >
              View All Categories
            </button>
            {onOpenGoLive && (
              <button
                onClick={onOpenGoLive}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Start Stream</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStreams.map((stream) => {
            return (
              <div
                key={stream.id}
                onClick={() => onSelectStream(stream)}
                className="group relative bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer hover:border-pink-500/60 hover:shadow-2xl hover:shadow-pink-900/20 transition-all duration-300 flex flex-col"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={stream.coverImage}
                    alt={stream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />

                  {/* Top Badges: Live & PK Battle or VIP */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>LIVE</span>
                    </div>

                    {stream.pkBattle?.isActive && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                        <Swords className="w-3 h-3" />
                        <span>PK ON</span>
                      </div>
                    )}

                    {stream.isPrivate && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black shadow border border-amber-300">
                        <Lock className="w-3 h-3" />
                        <span>VIP • {stream.pricePerMinute || stream.entryCoinFee || 20} Coins/min</span>
                      </div>
                    )}
                  </div>

                  {/* Viewers Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold">
                    <Users className="w-3 h-3 text-pink-400" />
                    <span>{stream.viewerCount.toLocaleString()}</span>
                  </div>

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Meta Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-pink-400 transition-colors line-clamp-1 mb-1.5">
                      {stream.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={stream.creator.avatar}
                        alt={stream.creator.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-700"
                      />
                      <span className="text-xs text-zinc-300 font-semibold">{stream.creator.name}</span>
                      <span className="text-xs">{stream.creator.countryFlag}</span>
                    </div>
                  </div>

                  {/* Tags & Diamonds */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Tag className="w-3 h-3 text-zinc-500" />
                      <span>{stream.category}</span>
                      {stream.isPrivate && (
                        <span className="text-amber-400 font-bold">
                          • {stream.pricePerMinute || 20} Coins/min
                        </span>
                      )}
                    </div>
                    <span className="text-amber-400 font-bold font-mono">
                      💎 {stream.totalDiamondsEarned.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
