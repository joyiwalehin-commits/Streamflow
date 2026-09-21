import {
  StreamingCredentials,
  StreamingPresenceInfo,
  StreamingSessionDetails,
  StreamingStatusResponse,
  StreamParticipantRole,
} from "../types";

/**
 * Service to interact with the backend Streaming Service Abstraction
 */
export const streamingProviderService = {
  /**
   * Retrieves current streaming provider configuration & production readiness
   */
  async getStatus(): Promise<StreamingStatusResponse> {
    try {
      const response = await fetch("/api/streaming/status");
      if (!response.ok) {
        throw new Error(`Failed to fetch streaming status: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn("Could not fetch streaming provider status from backend:", error);
      return {
        status: "dev_fallback",
        activeProvider: "dev_webrtc_mock",
        providerName: "Development WebRTC Adapter",
        isProductionReady: false,
        configuredProviders: [],
        availableAdapters: [],
        missingEnvVars: {
          livekit: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"],
        },
        supportedProtocols: ["WebRTC SFU", "WHIP", "WHEP", "RTMP"],
        instructions:
          "Running in Developer Readiness Mode. Configure LiveKit or Agora credentials in .env for production multi-peer video distribution.",
      };
    }
  },

  /**
   * Creates or registers a streaming session on the server
   */
  async createSession(params: {
    streamId: string;
    title: string;
    hostId: string;
    hostName: string;
    hostAvatar?: string;
    category?: string;
    isPrivate?: boolean;
  }): Promise<{ session: StreamingSessionDetails; broadcasterCredentials: StreamingCredentials }> {
    const response = await fetch("/api/streaming/session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to create streaming session: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Generates secure credentials (JWT / access token) for a broadcaster or viewer
   */
  async getCredentials(params: {
    streamId: string;
    userId: string;
    userName: string;
    role: StreamParticipantRole;
  }): Promise<StreamingCredentials> {
    const response = await fetch("/api/streaming/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to generate streaming credentials: ${response.statusText}`);
    }
    const data = await response.json();
    return data.credentials;
  },

  /**
   * Registers a participant joining a streaming room
   */
  async joinSession(params: {
    streamId: string;
    userId: string;
    userName: string;
    avatar?: string;
    role?: StreamParticipantRole;
  }): Promise<{
    session: StreamingSessionDetails;
    credentials: StreamingCredentials;
    totalViewers: number;
  }> {
    const response = await fetch("/api/streaming/session/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to join streaming session: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Sends periodic presence heartbeat to maintain active viewer status
   */
  async sendHeartbeat(params: {
    streamId: string;
    userId: string;
    userName?: string;
    role?: StreamParticipantRole;
  }): Promise<{ activeViewers: number; isHostOnline: boolean }> {
    const response = await fetch("/api/streaming/session/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to send presence heartbeat: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Leaves a streaming room to update presence immediately
   */
  async leaveSession(streamId: string, userId: string): Promise<number> {
    try {
      const response = await fetch("/api/streaming/session/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId, userId }),
      });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.remainingViewers || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Fetches real-time presence report for a given stream room
   */
  async getPresence(streamId: string): Promise<StreamingPresenceInfo> {
    const response = await fetch(`/api/streaming/session/${streamId}/presence`);
    if (!response.ok) {
      throw new Error(`Failed to retrieve presence report: ${response.statusText}`);
    }
    const data = await response.json();
    return data.presence;
  },

  /**
   * Ends a streaming session on the backend
   */
  async endSession(streamId: string): Promise<{ success: boolean; summary: any }> {
    const response = await fetch(`/api/streaming/session/${streamId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Failed to end streaming session: ${response.statusText}`);
    }
    return await response.json();
  },
};
