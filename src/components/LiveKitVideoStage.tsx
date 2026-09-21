import React, { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from "livekit-client";
import {
  CameraOff,
  Radio,
  Layers,
} from "lucide-react";
import { StreamingCredentials } from "../types";

interface LiveKitVideoStageProps {
  streamId: string;
  isHost: boolean;
  isMuted: boolean;
  videoMode: "camera" | "interactive_canvas";
  coverImage?: string;
  streamTitle?: string;
  creatorName?: string;
  credentials?: StreamingCredentials | null;
  cameraAvailable?: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onSwitchToCanvas?: () => void;
  onOpenSetupModal?: () => void;
}

export const LiveKitVideoStage: React.FC<LiveKitVideoStageProps> = ({
  streamId,
  isHost,
  isMuted,
  videoMode,
  coverImage,
  streamTitle,
  creatorName,
  credentials,
  cameraAvailable,
  localVideoRef,
  onSwitchToCanvas,
  onOpenSetupModal,
}) => {
  const [liveKitRoom, setLiveKitRoom] = useState<Room | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "fallback"
  >("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [stats, setStats] = useState<{ fps?: number; pingMs?: number }>({ pingMs: 24, fps: 60 });

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const internalLocalVideoRef = useRef<HTMLVideoElement>(null);

  const activeLocalVideoRef = localVideoRef || internalLocalVideoRef;

  // Handle LiveKit room lifecycle when valid production credentials are provided
  useEffect(() => {
    // Only attempt real LiveKit SFU connect if provider is livekit, credentials are production ready,
    // and serverUrl starts with wss:// or ws://
    const isLiveKitProduction =
      credentials &&
      credentials.provider === "livekit" &&
      credentials.isProductionReady &&
      credentials.token &&
      credentials.serverUrl &&
      (credentials.serverUrl.startsWith("wss://") || credentials.serverUrl.startsWith("ws://"));

    if (!isLiveKitProduction) {
      setConnectionStatus("fallback");
      return;
    }

    let isMounted = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    setConnectionStatus("connecting");
    setConnectionError(null);

    // Track Subscription for Viewers
    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _publication: any, _participant: RemoteParticipant) => {
        if (!isMounted) return;
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
          setHasRemoteVideo(true);
        } else if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
          track.attach(remoteAudioRef.current);
        }
      }
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack) => {
        if (!isMounted) return;
        track.detach();
        if (track.kind === Track.Kind.Video) {
          setHasRemoteVideo(false);
        }
      }
    );

    room.on(RoomEvent.Connected, async () => {
      if (!isMounted) return;
      setConnectionStatus("connected");

      // If host and camera mode, publish camera & microphone
      if (isHost && videoMode === "camera") {
        try {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(!isMuted);

          // Attach local video track to host video element
          const camPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (camPublication && camPublication.videoTrack && activeLocalVideoRef.current) {
            camPublication.videoTrack.attach(activeLocalVideoRef.current);
          }
        } catch (err: any) {
          console.warn("LiveKit publisher media error:", err);
        }
      }
    });

    room.on(RoomEvent.Reconnecting, () => {
      if (isMounted) setConnectionStatus("reconnecting");
    });

    room.on(RoomEvent.Disconnected, () => {
      if (isMounted) setConnectionStatus("disconnected");
    });

    // Connect to LiveKit SFU server
    room
      .connect(credentials.serverUrl!, credentials.token)
      .then(() => {
        if (isMounted) {
          setLiveKitRoom(room);
        }
      })
      .catch((err: any) => {
        console.warn("LiveKit connection notice (falling back to client transport):", err?.message);
        if (isMounted) {
          setConnectionStatus("fallback");
          setConnectionError(err?.message || "Could not connect to LiveKit SFU");
        }
      });

    return () => {
      isMounted = false;
      try {
        room.disconnect();
      } catch {
        // cleanup safe
      }
      setLiveKitRoom(null);
    };
  }, [credentials, isHost, videoMode]);

  // Sync mute state with LiveKit local participant if connected
  useEffect(() => {
    if (liveKitRoom && isHost && liveKitRoom.state === "connected") {
      liveKitRoom.localParticipant.setMicrophoneEnabled(!isMuted).catch(() => {});
    }
  }, [isMuted, liveKitRoom, isHost]);

  const isLiveKitActive =
    connectionStatus === "connected" && credentials?.provider === "livekit" && credentials?.isProductionReady;

  return (
    <div className="w-full h-full relative overflow-hidden bg-zinc-950 flex items-center justify-center select-none">
      {/* Hidden audio element for LiveKit remote tracks */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={isMuted} />

      {/* Host Camera Feed (LiveKit or Direct WebRTC getUserMedia) */}
      {isHost && videoMode === "camera" && (
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={activeLocalVideoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover -scale-x-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {cameraAvailable === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center">
              <CameraOff className="w-10 h-10 text-zinc-500 mb-2" />
              <p className="text-sm font-bold text-zinc-300">Camera Feed Unavailable</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1 mb-3">
                Switching to Interactive Studio Canvas to continue broadcasting.
              </p>
              {onSwitchToCanvas && (
                <button
                  onClick={onSwitchToCanvas}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  Use Interactive Video Canvas
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Viewer LiveKit Remote Video (When Subscribed) */}
      {!isHost && isLiveKitActive && hasRemoteVideo && (
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
        </div>
      )}

      {/* Viewer or Canvas Stage Visualizer (Fallback / Developer Mode) */}
      {(!isHost && (!isLiveKitActive || !hasRemoteVideo)) || (isHost && videoMode === "interactive_canvas") ? (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
          {coverImage && (
            <img
              src={coverImage}
              alt={streamTitle || "Live Stream"}
              className="w-full h-full object-cover filter brightness-90"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

          {/* Dynamic Audio Spectrum / Stage Visualizer */}
          <div className="absolute bottom-16 left-4 flex items-end gap-1 pointer-events-none opacity-80">
            {[18, 32, 48, 26, 40, 58, 30, 44, 22, 50, 36, 62].map((height, i) => (
              <div
                key={i}
                style={{ height: `${height}px` }}
                className="w-1.5 bg-gradient-to-t from-pink-500 to-indigo-400 rounded-full animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Top Video Overlay: LIVE status & Quality indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-20 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>LIVE</span>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-zinc-700 text-zinc-300 text-[10px] font-mono">
          {isHost && videoMode === "camera" ? "WebRTC Ingest • 60 FPS" : "HD 1080p • Low Latency"}
        </div>

        {/* LiveKit SFU Status Badge */}
        <div
          className={`px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border text-[10px] font-mono flex items-center gap-1.5 ${
            isLiveKitActive
              ? "border-emerald-500/40 text-emerald-300"
              : "border-zinc-700 text-zinc-300"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLiveKitActive ? "bg-emerald-400 animate-ping" : "bg-cyan-400"
            }`}
          />
          <span>{isLiveKitActive ? "LiveKit SFU" : "Real-Time Sync"}</span>
        </div>

        {/* Streaming Setup Modal Trigger */}
        <button
          onClick={onOpenSetupModal}
          className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-zinc-700 text-cyan-300 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
          title="Inspect streaming transport provider & credentials"
        >
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>{credentials?.provider.toUpperCase() || "LIVEKIT"}</span>
        </button>
      </div>

      {/* Developer Mode Transparency Notice for Viewers */}
      {!isHost && !credentials?.isProductionReady && (
        <div className="absolute top-12 left-3 right-3 z-20 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/40 backdrop-blur-md flex items-center justify-between gap-2 text-amber-200 text-xs shadow-lg">
          <div className="flex items-center gap-2 overflow-hidden">
            <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-[11px] truncate">
              <strong>Developer Mode:</strong> Video preview simulated. Connect LiveKit Cloud for real-time video delivery.
            </span>
          </div>
          {onOpenSetupModal && (
            <button
              onClick={onOpenSetupModal}
              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0 border border-amber-500/30 cursor-pointer"
            >
              Configure LiveKit
            </button>
          )}
        </div>
      )}
    </div>
  );
};
