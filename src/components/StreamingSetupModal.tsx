import React, { useState } from 'react';
import {
  X,
  Server,
  Shield,
  Key,
  Radio,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Wifi,
  Layers,
  Terminal,
} from 'lucide-react';
import { StreamingCredentials, StreamingStatusResponse } from '../types';

interface StreamingSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: StreamingStatusResponse | null;
  credentials: StreamingCredentials | null;
  streamId: string;
}

export const StreamingSetupModal: React.FC<StreamingSetupModalProps> = ({
  isOpen,
  onClose,
  status,
  credentials,
  streamId,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isProduction = Boolean(status?.isProductionReady);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                isProduction
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              }`}
            >
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Production Streaming Infrastructure</span>
                {isProduction ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
                    Live Provider Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/30">
                    Developer Readiness Mode
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Active Provider: <strong className="text-zinc-200">{status?.providerName || 'Evaluating...'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-zinc-300">
          {/* Honest Status Notification */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isProduction
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {isProduction ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-sm text-white">
                {isProduction
                  ? 'Real-Time Live Video Provider Active'
                  : 'Notice: External Video Provider Credentials Required for Production Multi-Peer'}
              </p>
              <p className="text-[11px] leading-relaxed opacity-90 text-zinc-300">
                {isProduction
                  ? 'Your backend has cryptographically signed credentials and connected to a production WebRTC media server. Real peer-to-peer live broadcasting is fully active.'
                  : 'StreamFlow is running in Developer Readiness Mode. While signaling, chat, Paystack coins, and PK battle scoring are 100% active, peer-to-peer video streaming across separate remote browsers requires an external WebRTC SFU provider (LiveKit or Agora). See setup details below.'}
              </p>
            </div>
          </div>

          {/* Secure Token & Room Credentials */}
          {credentials && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-200 font-bold">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>Session Access Credentials (Server-Signed)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
                  Role: {credentials.role.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px]">Room / Stream ID</span>
                  <span className="font-mono text-zinc-200 font-bold truncate block">{credentials.roomId}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px]">Expires At</span>
                  <span className="font-mono text-zinc-200 block">
                    {new Date(credentials.expiresAt).toLocaleTimeString()} (4 Hours)
                  </span>
                </div>
              </div>

              {/* JWT Token display */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Participant Access Token (JWT):</span>
                  <button
                    onClick={() => copyToClipboard(credentials.token, 'token')}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                  >
                    {copiedKey === 'token' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'token' ? 'Copied!' : 'Copy Token'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 font-mono text-[10px] text-zinc-400 break-all select-all">
                  {credentials.token}
                </div>
              </div>

              {/* Ingest / Playback Endpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {credentials.ingestEndpoint && (
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                    <span className="text-[10px] text-zinc-500 block">Ingest Protocol</span>
                    <span className="font-mono text-[11px] text-pink-400 font-bold">
                      {credentials.ingestEndpoint.protocol.toUpperCase()} Ingestion
                    </span>
                  </div>
                )}
                {credentials.playbackEndpoint && (
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                    <span className="text-[10px] text-zinc-500 block">Playback Protocol</span>
                    <span className="font-mono text-[11px] text-indigo-400 font-bold">
                      {credentials.playbackEndpoint.protocol.toUpperCase()} Edge Playback
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supported Providers Matrix */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>External Streaming Providers Supported</span>
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {/* LiveKit */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">LiveKit Cloud</span>
                    <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[10px] font-bold">
                      Recommended
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      status?.configuredProviders.includes('livekit')
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {status?.configuredProviders.includes('livekit') ? 'Configured' : 'Needs Config'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Open-source WebRTC SFU with sub-100ms latency. Ideal for co-hosting and PK battles.
                </p>
                <div className="bg-zinc-950 p-2 rounded-xl font-mono text-[10px] text-zinc-400 space-y-0.5">
                  <div>LIVEKIT_URL=wss://your-project.livekit.cloud</div>
                  <div>LIVEKIT_API_KEY=API...</div>
                  <div>LIVEKIT_API_SECRET=secret...</div>
                </div>
              </div>

              {/* Agora */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Agora RTC</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      status?.configuredProviders.includes('agora')
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {status?.configuredProviders.includes('agora') ? 'Configured' : 'Needs Config'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Real-time interactive broadcasting network with native host and audience channel roles.
                </p>
                <div className="bg-zinc-950 p-2 rounded-xl font-mono text-[10px] text-zinc-400 space-y-0.5">
                  <div>AGORA_APP_ID=your_agora_app_id</div>
                  <div>AGORA_APP_CERTIFICATE=your_agora_app_certificate</div>
                </div>
              </div>

              {/* Mux */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Mux Video</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      status?.configuredProviders.includes('mux')
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {status?.configuredProviders.includes('mux') ? 'Configured' : 'Needs Config'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  RTMP and WHIP ingest with low-latency HLS delivery and automated instant stream recording.
                </p>
                <div className="bg-zinc-950 p-2 rounded-xl font-mono text-[10px] text-zinc-400 space-y-0.5">
                  <div>MUX_TOKEN_ID=your_mux_token_id</div>
                  <div>MUX_TOKEN_SECRET=your_mux_token_secret</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Secrets Note */}
          <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-2.5 text-[11px] text-zinc-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Security Verified:</strong> All streaming provider API secrets remain strictly isolated in backend server environment variables. The browser only receives ephemeral signed access tokens.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Cpu className="w-3.5 h-3.5 text-pink-400" />
            <span>StreamFlow Video Transport v2.0</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
