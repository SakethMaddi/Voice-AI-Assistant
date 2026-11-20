import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';

export interface LiveKitConnectionState {
  isConnected: boolean;
  isMuted: boolean;
  participantCount: number;
  statusText: string;
}

export class LiveKitAudioSession {
  private room: Room | null = null;
  private onStateChange: ((state: LiveKitConnectionState) => void) | null = null;
  private onAudioChunk: ((speaker: 'agent' | 'customer', base64: string) => void) | null = null;
  private onSpeechTranscript: ((speaker: 'agent' | 'customer', text: string, isFinal: boolean) => void) | null = null;
  private isMuted = false;
  private customerRecorder: MediaRecorder | null = null;
  private agentRecorder: MediaRecorder | null = null;
  private localStream: MediaStream | null = null;
  private agentInterval: any = null;
  private customerInterval: any = null;
  private speechRecognition: any = null;
  private isCallActive = false;

  async connect(
    url: string,
    token: string,
    onStateChange: (state: LiveKitConnectionState) => void,
    onAudioChunk?: (speaker: 'agent' | 'customer', base64: string) => void,
    onSpeechTranscript?: (speaker: 'agent' | 'customer', text: string, isFinal: boolean) => void
  ): Promise<boolean> {
    this.onStateChange = onStateChange;
    this.onAudioChunk = onAudioChunk || null;
    this.onSpeechTranscript = onSpeechTranscript || null;
    this.isCallActive = true;

    // 1. First, acquire local microphone stream from the browser
    // This guarantees voice capture even if LiveKit server is simulated or offline
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const micTrack = this.localStream.getAudioTracks()[0];
        if (micTrack) {
          console.log('🎤 Agent microphone captured successfully');
          this.setupTrackRecorder(micTrack, 'agent');
          this.initSpeechRecognition('agent');
        }
      }
    } catch (micErr: any) {
      console.warn('Microphone permission not granted or device unavailable:', micErr.message);
    }

    // 2. Connect to LiveKit server
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.room
        .on(RoomEvent.Connected, () => {
          console.log('✅ Connected to LiveKit WebRTC');
          this.updateState('Connected (WebRTC Audio Active)', true);
        })
        .on(RoomEvent.Disconnected, () => {
          this.updateState('Disconnected', false);
        })
        .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log(`LiveKit participant joined: ${participant.identity}`);
          this.updateState(`Customer Connected (${participant.identity})`, true);
        })
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio) {
            console.log('Customer audio track attached');
            const audioElement = track.attach();
            audioElement.autoplay = true;

            // Stream customer audio track to voice processing service
            this.setupTrackRecorder(track.mediaStreamTrack, 'customer');
          }
        });

      // Connect to LiveKit server
      await this.room.connect(url, token);

      // Publish local audio to LiveKit room
      try {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      } catch (e: any) {
        console.warn('LiveKit local participant mic enable warning:', e.message);
      }

      // Check if remote participants are already present in room
      this.room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Audio) {
            pub.track.attach();
            this.setupTrackRecorder(pub.track.mediaStreamTrack, 'customer');
          }
        });
      });

      this.updateState('Audio Channel Ready (WebRTC)', true);
      return true;
    } catch (err: any) {
      console.warn('LiveKit direct WebRTC connection failed, running with local microphone audio:', err.message);
      this.updateState('Microphone Live (Local Telephony Audio Active)', true);
      return false;
    }
  }

  /**
   * Sets up real-time audio chunk recording with valid standalone WebM containers
   */
  private setupTrackRecorder(mediaStreamTrack: MediaStreamTrack, speaker: 'agent' | 'customer') {
    if (typeof MediaRecorder === 'undefined' || !this.onAudioChunk) return;

    try {
      const stream = new MediaStream([mediaStreamTrack]);
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      }

      // Voice Activity Detection (VAD) via AudioContext
      let analyser: AnalyserNode | null = null;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const src = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
        }
      } catch {
        // Proceed without VAD if AudioContext is restricted
      }

      const hasSound = (): boolean => {
        if (!analyser) return true;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        return avg > 10; // Sound threshold above background silence
      };

      const createRecorder = () => {
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

        recorder.ondataavailable = (e: BlobEvent) => {
          // Only send if data exists and sound is detected above silence threshold
          if (e.data && e.data.size > 0 && this.onAudioChunk && hasSound()) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              if (res && res.includes(',')) {
                const base64 = res.split(',')[1];
                if (base64 && this.onAudioChunk) {
                  this.onAudioChunk(speaker, base64);
                }
              }
            };
            reader.readAsDataURL(e.data);
          }
        };

        return recorder;
      };

      const recorder = createRecorder();
      if (speaker === 'customer') {
        this.customerRecorder = recorder;
      } else {
        this.agentRecorder = recorder;
      }

      recorder.start();

      // Periodically slice every 3.5 seconds with a complete WebM container header
      const interval = setInterval(() => {
        if (!this.isCallActive) {
          clearInterval(interval);
          return;
        }

        const activeRec = speaker === 'customer' ? this.customerRecorder : this.agentRecorder;
        if (activeRec && activeRec.state === 'recording') {
          try {
            activeRec.stop();
            // Start immediate next slice so every chunk has its own valid WebM header for Whisper
            activeRec.start();
          } catch (e) {
            console.warn('Audio slice error:', e);
          }
        }
      }, 3500);

      if (speaker === 'customer') {
        this.customerInterval = interval;
      } else {
        this.agentInterval = interval;
      }
    } catch (err) {
      console.warn(`Could not start audio recorder for ${speaker}:`, err);
    }
  }

  /**
   * In-browser Real-Time Speech Recognition for zero-latency agent transcription
   */
  private initSpeechRecognition(speaker: 'agent' | 'customer') {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec || !this.onSpeechTranscript) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript;
          const isFinal = event.results[i].isFinal;
          if (transcript && this.onSpeechTranscript) {
            this.onSpeechTranscript(speaker, transcript.trim(), isFinal);
          }
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('Speech recognition warning:', err.error);
        }
      };

      recognition.onend = () => {
        // Automatically restart speech recognition while call is active
        if (this.isCallActive) {
          try {
            recognition.start();
          } catch {
            // Already started or busy
          }
        }
      };

      recognition.start();
      this.speechRecognition = recognition;
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition:', e);
    }
  }

  async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;

    // Toggle local media tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }

    if (this.room?.localParticipant) {
      try {
        await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
      } catch (e) {
        console.warn('Could not toggle LiveKit mic track:', e);
      }
    }

    this.updateState(this.isMuted ? 'Muted' : 'Unmuted', true);
    return this.isMuted;
  }

  disconnect() {
    this.isCallActive = false;

    // Clear intervals
    if (this.agentInterval) clearInterval(this.agentInterval);
    if (this.customerInterval) clearInterval(this.customerInterval);
    this.agentInterval = null;
    this.customerInterval = null;

    // Stop speech recognition
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {
        // Ignore
      }
      this.speechRecognition = null;
    }

    // Stop recorders
    try {
      this.customerRecorder?.stop();
      this.agentRecorder?.stop();
    } catch {
      // Ignore recorder stop error
    }
    this.customerRecorder = null;
    this.agentRecorder = null;

    // Stop microphone tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    // Disconnect LiveKit room
    if (this.room) {
      try {
        this.room.disconnect();
      } catch (e) {
        console.error('Error disconnecting room:', e);
      }
      this.room = null;
    }

    this.updateState('Disconnected', false);
  }

  private updateState(statusText: string, isConnected: boolean) {
    if (this.onStateChange) {
      this.onStateChange({
        isConnected,
        isMuted: this.isMuted,
        participantCount: this.room?.remoteParticipants.size || 1,
        statusText,
      });
    }
  }
}
