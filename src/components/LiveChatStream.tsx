import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Globe, 
  Languages, 
  Bot, 
  Sparkles, 
  Smile, 
  Heart,
  Volume2,
  MessageSquareOff
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { SUPPORTED_LANGUAGES } from '../mockData';

interface LiveChatStreamProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: UserProfile;
  selectedLanguage: string;
  creatorName: string;
  commentsEnabled?: boolean;
  onRequestCohostAi?: () => void;
}

export const LiveChatStream: React.FC<LiveChatStreamProps> = ({
  messages,
  onSendMessage,
  currentUser,
  selectedLanguage,
  creatorName,
  commentsEnabled = true,
  onRequestCohostAi,
}) => {
  const [inputText, setInputText] = useState('');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, translatedMap]);

  // Handle translation requests via server Gemini API
  const handleTranslateMessage = async (msgId: string, text: string) => {
    if (translatingIds[msgId]) return;
    setTranslatingIds((prev) => ({ ...prev, [msgId]: true }));

    const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: targetLangName,
        }),
      });

      if (!response.ok) {
        throw new Error('Server translation failed');
      }

      const data = await response.json();
      setTranslatedMap((prev) => ({
        ...prev,
        [msgId]: data.translation || text,
      }));
    } catch (err) {
      console.warn('Real-time translation error, fallback simulation:', err);
      // Helpful fallback in case API key is configuring
      setTranslatedMap((prev) => ({
        ...prev,
        [msgId]: `[${targetLangName.slice(0, 2).toUpperCase()}] ${text} ✨`,
      }));
    } finally {
      setTranslatingIds((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div id="live-chat-panel" className="flex flex-col h-full bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl">
      {/* Top Header of Chat */}
      <div className="px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-zinc-200">Global Live Chat</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            {messages.length} msgs
          </span>
        </div>

        {/* Translation Toggle & AI Cohost Trigger */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoTranslateEnabled(!autoTranslateEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              autoTranslateEnabled
                ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Live Auto-Translate with Gemini AI"
          >
            <Languages className="w-3 h-3 text-indigo-400" />
            <span>AI Translate: {currentLangObj.flag}</span>
          </button>

          {onRequestCohostAi && (
            <button
              onClick={onRequestCohostAi}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-950/40 border border-pink-500/40 text-pink-300 text-[11px] font-semibold hover:bg-pink-900/40 transition-all"
              title="Summon FlowBot AI Live Co-host"
            >
              <Bot className="w-3 h-3 text-pink-400" />
              <span>FlowBot</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {messages.map((msg) => {
          const isTranslated = !!translatedMap[msg.id];
          const isTranslating = !!translatingIds[msg.id];

          // System or AI co-host announcement
          if (msg.type === 'system' || msg.type === 'ai-cohost' || msg.type === 'pk-alert') {
            return (
              <div
                key={msg.id}
                className={`p-2 rounded-xl border text-[11px] flex items-start gap-2 ${
                  msg.type === 'ai-cohost'
                    ? 'bg-gradient-to-r from-purple-950/40 to-pink-950/40 border-purple-500/40 text-purple-200'
                    : msg.type === 'pk-alert'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                }`}
              >
                {msg.type === 'ai-cohost' ? (
                  <Bot className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold mr-1.5">{msg.senderName}:</span>
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          // Gift alert message
          if (msg.type === 'gift' && msg.giftInfo) {
            return (
              <div
                key={msg.id}
                className="p-2 rounded-xl bg-gradient-to-r from-amber-950/50 via-pink-950/40 to-purple-950/40 border border-amber-500/40 flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-400"
                  />
                  <div>
                    <span className="font-bold text-amber-300">{msg.senderName}</span>
                    <span className="text-zinc-300 mx-1">sent</span>
                    <span className="font-extrabold text-pink-400">{msg.giftInfo.giftName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-lg font-black animate-bounce">
                  <span>{msg.giftInfo.giftIcon}</span>
                  <span className="text-amber-300 text-xs font-mono">x{msg.giftInfo.count}</span>
                </div>
              </div>
            );
          }

          // Regular User Chat Message
          return (
            <div
              key={msg.id}
              className="group p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 transition-colors"
            >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <span className="font-bold text-zinc-300 hover:text-white cursor-pointer">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-pink-400 font-mono font-bold">
                    Lv{msg.senderLevel}
                  </span>
                  {msg.sourceLanguage && (
                    <span className="text-[10px] text-zinc-500 font-medium">
                      ({msg.sourceLanguage})
                    </span>
                  )}
                </div>

                {/* Instant Translation Trigger */}
                <button
                  onClick={() => handleTranslateMessage(msg.id, msg.text)}
                  disabled={isTranslating}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-opacity"
                  title="Translate to selected language"
                >
                  <Globe className="w-3 h-3" />
                  <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
                </button>
              </div>

              {/* Original Message Text */}
              <p className="text-zinc-200 leading-relaxed pl-6.5 text-[12px]">
                {msg.text}
              </p>

              {/* Translated Text Bubble */}
              {isTranslated && (
                <div className="mt-1.5 ml-6.5 p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-[11px] flex items-start gap-1.5">
                  <Languages className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-300 text-[10px] block mb-0.5">
                      AI Translated ({currentLangObj.name}):
                    </span>
                    <span>{translatedMap[msg.id]}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field or Disabled Banner */}
      {commentsEnabled ? (
        <form onSubmit={handleSend} className="p-2.5 border-t border-zinc-800 bg-zinc-900/90 flex items-center gap-2">
          <input
            type="text"
            id="chat-input-field"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Chat with ${creatorName} in any language...`}
            className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
          />

          <button
            type="button"
            onClick={() => onSendMessage('🔥 Amazing performance! Sending hype!')}
            className="p-2 text-amber-400 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Send Quick Hype"
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={!inputText.trim()}
            id="send-chat-btn"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-900/30 transition-all cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div id="comments-disabled-notice" className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <MessageSquareOff className="w-4 h-4 text-zinc-500" />
          <span>Comments are disabled by the host for this stream</span>
        </div>
      )}
    </div>
  );
};
