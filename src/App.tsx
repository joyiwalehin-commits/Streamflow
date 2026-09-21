import React, { useState } from 'react';
import { 
  CURRENT_USER, 
  INITIAL_STREAMS, 
  INITIAL_SHORTS, 
  OPPONENT_CREATORS 
} from './mockData';
import { 
  UserProfile, 
  StreamSession, 
  ShortVideo, 
  VirtualGift, 
  StreamExportReport 
} from './types';
import { NavigationHeader } from './components/NavigationHeader';
import { LiveDiscoveryGrid } from './components/LiveDiscoveryGrid';
import { LiveRoomView } from './components/LiveRoomView';
import { FlowShortsFeed } from './components/FlowShortsFeed';
import { CreatorStudio } from './components/CreatorStudio';
import { GoLiveModal } from './components/GoLiveModal';
import { CreateShortModal } from './components/CreateShortModal';
import { CoinWalletModal } from './components/CoinWalletModal';
import { BuyCoinsPage } from './components/BuyCoinsPage';
import { CreatorWalletPage } from './components/CreatorWalletPage';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { sendVirtualGift, fetchUserWallet } from './services/creatorEarnings';
import { fetchActiveStreams, startLiveStream } from './services/streamService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);
  const [streams, setStreams] = useState<StreamSession[]>(INITIAL_STREAMS);
  const [shorts, setShorts] = useState<ShortVideo[]>(INITIAL_SHORTS);
  const [activeTab, setActiveTab] = useState<'live' | 'shorts' | 'discover' | 'creator-studio' | 'buy-coins' | 'creator-wallet'>('live');
  const [selectedStream, setSelectedStream] = useState<StreamSession | null>(INITIAL_STREAMS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Modals state
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [isCreateShortOpen, setIsCreateShortOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // Google OAuth & Sheets Integration
  const {
    accessToken,
    loginWithGoogle,
    isConnected: isSheetsConnected,
  } = useGoogleAuth();

  // Stream Performance History for Creator Studio & Google Sheets
  const [recentSessions, setRecentSessions] = useState<StreamExportReport[]>([
    {
      timestamp: '2026-09-19 22:30',
      streamTitle: '🔥 Live DJ Set & Global PK Battle vs Tokyo',
      streamer: 'Alex Rivera',
      duration: '1h 14m',
      peakViewers: 14200,
      totalGiftsReceived: 420,
      diamondsEarned: 18500,
      estimatedEarningsUsd: 92.50,
      pkWinLoss: 'Won 2 - 1',
      topGifter: 'Elena_V',
    },
    {
      timestamp: '2026-09-18 20:15',
      streamTitle: 'VIP Lounge Acoustic Night & Jam',
      streamer: 'Alex Rivera',
      duration: '45m',
      peakViewers: 6300,
      totalGiftsReceived: 180,
      diamondsEarned: 8900,
      estimatedEarningsUsd: 44.50,
      pkWinLoss: 'N/A',
      topGifter: 'CyberFan_99',
    },
    {
      timestamp: '2026-09-16 19:00',
      streamTitle: 'Tokyo vs NYC Beat Battle Rematch',
      streamer: 'Alex Rivera',
      duration: '1h 02m',
      peakViewers: 11900,
      totalGiftsReceived: 310,
      diamondsEarned: 14200,
      estimatedEarningsUsd: 71.00,
      pkWinLoss: 'Won 1 - 0',
      topGifter: 'Lucas_Rio',
    },
  ]);

  // Sync user wallet with backend on mount
  React.useEffect(() => {
    fetchUserWallet(currentUser.id)
      .then((w) => {
        if (w && typeof w.viewerCoins === 'number') {
          setCurrentUser(prev => ({
            ...prev,
            coins: w.viewerCoins,
          }));
        }
      })
      .catch((err) => {
        console.warn('Initial wallet sync failed:', err);
      });

    // Fetch authoritative active live streams from server
    fetchActiveStreams()
      .then((activeStreams) => {
        if (activeStreams && activeStreams.length > 0) {
          setStreams(activeStreams);
          setSelectedStream(activeStreams[0]);
        }
      })
      .catch((err) => {
        console.warn('Initial live streams fetch notice:', err);
      });
  }, [currentUser.id]);

  // Handlers
  const handleSendGift = async (gift: VirtualGift, count: number) => {
    const cost = gift.coinPrice * count;
    const diamondsEarned = cost; // 1 Coin spent = 1 Diamond for creator

    // Optimistically deduct coins from user
    setCurrentUser(prev => ({
      ...prev,
      coins: Math.max(0, prev.coins - cost),
    }));

    // Update active stream stats immediately for snappy UI
    if (selectedStream) {
      setSelectedStream(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalDiamondsEarned: prev.totalDiamondsEarned + diamondsEarned,
          pkBattle: prev.pkBattle ? {
            ...prev.pkBattle,
            playerScore: prev.pkBattle.playerScore + cost,
          } : undefined,
        };
      });
    }

    // Call server to securely deduct viewer coins, credit creator earnings, record transaction with idempotency
    try {
      const idempotencyKey = `gift_client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const result = await sendVirtualGift({
        idempotencyKey,
        streamId: selectedStream ? selectedStream.id : 'stream_live',
        streamTitle: selectedStream ? selectedStream.title : 'Live Stream Session',
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        creatorId: selectedStream?.creator?.id || 'creator_tokyo',
        creatorName: selectedStream?.creator?.name || 'Live Creator',
        giftId: gift.id,
        count,
      });

      if (result && typeof result.senderCoins === 'number') {
        const newCoins = result.senderCoins;
        setCurrentUser(prev => ({
          ...prev,
          coins: newCoins,
        }));
      }
    } catch (err: any) {
      console.error('Failed to send virtual gift via backend:', err);
      // Re-sync wallet on error
      fetchUserWallet(currentUser.id).then((w) => {
        if (w && typeof w.viewerCoins === 'number') {
          setCurrentUser(prev => ({ ...prev, coins: w.viewerCoins }));
        }
      }).catch(() => {});
    }
  };

  const handleLikeStream = () => {
    if (selectedStream) {
      setSelectedStream(prev => prev ? { ...prev, likesCount: prev.likesCount + 1 } : prev);
    }
  };

  const handleRechargeCoins = (amount: number) => {
    setCurrentUser(prev => ({
      ...prev,
      coins: prev.coins + amount,
    }));
  };

  const handleStartLive = async (newStreamData: Partial<StreamSession>) => {
    try {
      const serverStream = await startLiveStream({
        title: newStreamData.title || 'Live Stream',
        category: newStreamData.category || 'ChitChat',
        commentsEnabled: newStreamData.commentsEnabled !== false,
        videoMode: newStreamData.videoMode || 'camera',
        isPrivate: !!newStreamData.isPrivate,
        privatePasscode: newStreamData.privatePasscode,
        entryCoinFee: newStreamData.entryCoinFee,
        tags: newStreamData.tags || ['Live'],
        creator: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          country: currentUser.country,
          countryFlag: currentUser.countryFlag,
          followers: currentUser.followers,
        },
      });

      const fullStream: StreamSession = {
        ...serverStream,
        creator: currentUser,
        guests: [],
        pkBattle: newStreamData.pkBattle,
      };

      setStreams(prev => [fullStream, ...prev.filter(s => s.id !== fullStream.id)]);
      setSelectedStream(fullStream);
      setActiveTab('live');

      // Add session stub to recent logs
      setRecentSessions(prev => [
        {
          timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          streamTitle: fullStream.title,
          streamer: currentUser.name,
          duration: 'Live Now',
          peakViewers: 1,
          totalGiftsReceived: 0,
          diamondsEarned: 0,
          estimatedEarningsUsd: 0,
          pkWinLoss: fullStream.pkBattle ? 'In Progress' : 'Solo Stream',
          topGifter: 'None yet',
        },
        ...prev,
      ]);
    } catch (err) {
      console.warn('Backend start live failed, using local fallback:', err);
      const streamId = `stream_${Date.now()}`;
      const fallbackStream: StreamSession = {
        id: streamId,
        title: newStreamData.title || 'Live Stream',
        creator: currentUser,
        category: newStreamData.category || 'ChitChat',
        commentsEnabled: newStreamData.commentsEnabled !== false,
        videoMode: newStreamData.videoMode || 'camera',
        viewerCount: 1,
        likesCount: 0,
        isLive: true,
        isPrivate: !!newStreamData.isPrivate,
        privatePasscode: newStreamData.privatePasscode,
        entryCoinFee: newStreamData.entryCoinFee,
        coverImage: currentUser.avatar,
        tags: newStreamData.tags || ['Live'],
        totalDiamondsEarned: 0,
        durationSeconds: 0,
        guests: [],
        pkBattle: newStreamData.pkBattle,
      };

      setStreams(prev => [fallbackStream, ...prev]);
      setSelectedStream(fallbackStream);
      setActiveTab('live');
    }
  };

  const handleCreateShort = (newShort: ShortVideo) => {
    setShorts(prev => [newShort, ...prev]);
    setActiveTab('shorts');
  };

  const handleLikeShort = (shortId: string) => {
    setShorts(prev => prev.map(s => {
      if (s.id === shortId) {
        return {
          ...s,
          likes: s.isLiked ? s.likes - 1 : s.likes + 1,
          isLiked: !s.isLiked,
        };
      }
      return s;
    }));
  };

  const handleAddShortComment = (shortId: string, comment: string) => {
    setShorts(prev => prev.map(s => {
      if (s.id === shortId) {
        return {
          ...s,
          commentsCount: s.commentsCount + 1,
        };
      }
      return s;
    }));
  };

  return (
    <div id="streamflow-app-root" className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Universal Top Header */}
      <NavigationHeader
        currentUser={currentUser}
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'discover') {
            setSelectedStream(null);
          }
        }}
        onGoLiveClick={() => setIsGoLiveOpen(true)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        isSheetsConnected={isSheetsConnected}
        onSheetsClick={() => {
          if (!isSheetsConnected) {
            loginWithGoogle();
          } else {
            setActiveTab('creator-studio');
          }
        }}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      {/* Main Content Router */}
      <main className="flex-1 overflow-x-hidden">
        {/* Live Stream View or Grid */}
        {activeTab === 'live' && (
          selectedStream ? (
            <LiveRoomView
              stream={selectedStream}
              currentUser={currentUser}
              selectedLanguage={selectedLanguage}
              onSendGift={handleSendGift}
              onLikeStream={handleLikeStream}
              onAddCoins={() => setActiveTab('buy-coins')}
              onCoinsUpdated={(newCoins) => {
                setCurrentUser((prev) => ({ ...prev, coins: newCoins }));
              }}
              onExportToSheets={() => setActiveTab('creator-studio')}
              onBackToExplore={() => setSelectedStream(null)}
              onOpenCreatorWallet={() => setActiveTab('creator-wallet')}
            />
          ) : (
            <LiveDiscoveryGrid
              streams={streams}
              onSelectStream={(stream) => setSelectedStream(stream)}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onOpenBuyCoins={() => setActiveTab('buy-coins')}
              onOpenGoLive={() => setIsGoLiveOpen(true)}
            />
          )
        )}

        {/* Explore / Discovery View */}
        {activeTab === 'discover' && (
          <LiveDiscoveryGrid
            streams={streams}
            onSelectStream={(stream) => {
              setSelectedStream(stream);
              setActiveTab('live');
            }}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onOpenBuyCoins={() => setActiveTab('buy-coins')}
            onOpenGoLive={() => setIsGoLiveOpen(true)}
          />
        )}

        {/* FlowShorts Vertical Feed */}
        {activeTab === 'shorts' && (
          <FlowShortsFeed
            shorts={shorts}
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            onLikeShort={handleLikeShort}
            onAddComment={handleAddShortComment}
            onOpenCreateShort={() => setIsCreateShortOpen(true)}
          />
        )}

        {/* Creator Studio & Google Sheets Analytics */}
        {activeTab === 'creator-studio' && (
          <CreatorStudio
            currentUser={currentUser}
            isSheetsConnected={isSheetsConnected}
            accessToken={accessToken}
            onConnectGoogleSheets={loginWithGoogle}
            recentSessions={recentSessions}
          />
        )}

        {/* Creator Wallet & Paystack Earnings Withdrawals */}
        {activeTab === 'creator-wallet' && (
          <CreatorWalletPage
            currentUser={currentUser}
            onOpenBuyCoins={() => setActiveTab('buy-coins')}
            onGoBackToLive={() => setActiveTab('live')}
          />
        )}

        {/* Buy Coins (Paystack NGN System) */}
        {activeTab === 'buy-coins' && (
          <BuyCoinsPage
            currentUser={currentUser}
            onCoinsCredited={handleRechargeCoins}
            onGoBackToLive={() => setActiveTab('live')}
          />
        )}
      </main>

      {/* Modals */}
      <GoLiveModal
        isOpen={isGoLiveOpen}
        onClose={() => setIsGoLiveOpen(false)}
        currentUser={currentUser}
        onStartLive={handleStartLive}
      />

      <CreateShortModal
        isOpen={isCreateShortOpen}
        onClose={() => setIsCreateShortOpen(false)}
        currentUser={currentUser}
        onCreateShort={handleCreateShort}
      />

      <CoinWalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        currentUser={currentUser}
        onRechargeCoins={handleRechargeCoins}
        onOpenBuyCoinsPage={() => {
          setIsWalletOpen(false);
          setActiveTab('buy-coins');
        }}
        onOpenCreatorWallet={() => {
          setIsWalletOpen(false);
          setActiveTab('creator-wallet');
        }}
      />
    </div>
  );
}
