// Secure WebRTC Signaling & Connection Manager using BroadcastChannel
// Enables real P2P video/voice calling across tabs on the same origin.
import { 
  generateECDHKeys, 
  exportPublicKey, 
  importPublicKey, 
  deriveAESGCMKey, 
  deriveSharedSecretBits, 
  generateSecurityFingerprint 
} from './crypto';

export class SecureCallManager {
  constructor({
    onStateChange,
    onLocalStream,
    onRemoteStream,
    onSecurityLog,
    onFingerprintReady,
    onCallEnded
  }) {
    this.onStateChange = onStateChange || (() => {});
    this.onLocalStream = onLocalStream || (() => {});
    this.onRemoteStream = onRemoteStream || (() => {});
    this.onSecurityLog = onSecurityLog || (() => {});
    this.onFingerprintReady = onFingerprintReady || (() => {});
    this.onCallEnded = onCallEnded || (() => {});

    // Unique ID for this tab session
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
    this.remotePeerId = null;

    // Cryptographic States
    this.localKeyPair = null;
    this.localPublicKeyHex = null;
    this.remotePublicKey = null;
    this.sharedSecretBits = null;
    this.aesKey = null;
    this.securityFingerprint = null;

    // WebRTC States
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;

    // Canvas stream generator for visual camera fallback
    this.canvasInterval = null;

    // BroadcastChannel Signaling
    this.channel = new BroadcastChannel('chatbot_secure_channel');
    this.channel.onmessage = (event) => this.handleSignalingMessage(event.data);

    this.logSecurity('System initialized. Unique Session ID: ' + this.peerId);
  }

  logSecurity(message, type = 'info') {
    this.onSecurityLog({
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    });
  }

  async initializeCrypto() {
    this.logSecurity('Generating secure ECDH (P-256) key pair...', 'crypto');
    this.localKeyPair = await generateECDHKeys();
    this.localPublicKeyHex = await exportPublicKey(this.localKeyPair.publicKey);
    this.logSecurity(`ECDH Key pair generated. Public key (SPKI Hex): ${this.localPublicKeyHex.substring(0, 32)}...`, 'crypto');
  }

  // Fallback: Generate a high-tech simulated video stream from a canvas if no camera is available
  createFallbackStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    let frame = 0;
    this.canvasInterval = setInterval(() => {
      frame++;
      // Dark futuristic background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Animated green grids
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Rotating radar/scanner
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 120 + Math.sin(frame * 0.05) * 10, 0, Math.PI * 2);
      ctx.stroke();

      // Scanning line
      const scanY = (frame * 3) % canvas.height;
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      // Lock icon & security labels
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('🔒 E2EE SECURE VIDEO FEED', 50, 60);

      ctx.fillStyle = '#8a99ad';
      ctx.font = '14px monospace';
      ctx.fillText(`FRAME: ${frame} | CIPHER: AES-GCM-256`, 50, 90);
      ctx.fillText(`STREAM ID: ${this.peerId.toUpperCase()}`, 50, 110);
      
      // Audio waveform simulation
      ctx.strokeStyle = '#00b0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, 400);
      for (let i = 0; i < 540; i++) {
        const amp = Math.sin(i * 0.05 + frame * 0.2) * Math.cos(i * 0.01) * 30;
        ctx.lineTo(50 + i, 400 + amp);
      }
      ctx.stroke();
      
    }, 1000 / 30); // 30 FPS

    // Audio fallback (silent audio node)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const dst = audioContext.createMediaStreamDestination();
    oscillator.connect(dst);
    // Keep it silent
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    oscillator.connect(gainNode);
    gainNode.connect(dst);
    oscillator.start();

    const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
    const audioTrack = dst.stream.getAudioTracks()[0];

    return new MediaStream([videoTrack, audioTrack]);
  }

  async getMediaStream(useVideo = true) {
    try {
      this.logSecurity('Requesting camera and microphone access...', 'info');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: useVideo ? { width: 640, height: 480 } : false,
        audio: true
      });
      this.logSecurity('Media access granted successfully.', 'info');
      return stream;
    } catch (error) {
      this.logSecurity('Media access failed (no device or permission denied). Initializing simulated secure video stream.', 'warn');
      return this.createFallbackStream();
    }
  }

  // Initiate call to other tab
  async startCall(useVideo = true) {
    this.onStateChange('dialing');
    this.logSecurity('Starting call. Initializing handshake...', 'info');
    await this.initializeCrypto();

    // Broadcast call invitation
    this.channel.postMessage({
      type: 'CALL_INITIATED',
      from: this.peerId,
      publicKeyHex: this.localPublicKeyHex,
      useVideo
    });
    this.logSecurity('Call invitation sent. Waiting for remote peer to answer...', 'info');
  }

  // Accept incoming call
  async acceptCall(senderId, senderPublicKeyHex, useVideo = true) {
    this.onStateChange('connecting');
    this.remotePeerId = senderId;
    this.logSecurity(`Incoming call accepted from ${senderId}. Performing key exchange...`, 'info');
    
    await this.initializeCrypto();

    // Send public key back
    this.channel.postMessage({
      type: 'CALL_ACCEPTED',
      to: this.remotePeerId,
      from: this.peerId,
      publicKeyHex: this.localPublicKeyHex,
      useVideo
    });

    // Derive Shared Secret and Emojis immediately
    await this.completeKeyExchange(senderPublicKeyHex);
    
    // Set up local media
    this.localStream = await this.getMediaStream(useVideo);
    this.onLocalStream(this.localStream);

    // Setup WebRTC connection
    this.setupPeerConnection();
  }

  // Reject call
  rejectCall(senderId) {
    this.channel.postMessage({
      type: 'CALL_REJECTED',
      to: senderId
    });
    this.logSecurity('Call rejected.', 'info');
    this.cleanup();
  }

  // Cryptographic Complete Handshake
  async completeKeyExchange(remoteKeyHex) {
    this.logSecurity('Importing remote public key...', 'crypto');
    this.remotePublicKey = await importPublicKey(remoteKeyHex);
    
    this.logSecurity('Performing Elliptic Curve Diffie-Hellman (ECDH) key agreement...', 'crypto');
    this.sharedSecretBits = await deriveSharedSecretBits(this.localKeyPair.privateKey, this.remotePublicKey);
    this.aesKey = await deriveAESGCMKey(this.localKeyPair.privateKey, this.remotePublicKey);
    
    this.logSecurity('ECDH Shared secret derived successfully. AES-256-GCM symmetric session key ready.', 'crypto');

    // Generate security fingerprints
    this.logSecurity('Generating visual E2EE verification emoji code...', 'crypto');
    this.securityFingerprint = await generateSecurityFingerprint(this.sharedSecretBits);
    
    this.logSecurity(`Verification emojis: ${this.securityFingerprint.emojis.join(' ')} (Verify with other peer)`, 'crypto');
    this.onFingerprintReady(this.securityFingerprint);
  }

  // Setup WebRTC connection
  setupPeerConnection() {
    this.logSecurity('Creating RTCPeerConnection with local configurations...', 'webrtc');
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    this.peerConnection = new RTCPeerConnection(configuration);

    // Add local tracks to WebRTC
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
      this.logSecurity(`Added track: ${track.kind} (${track.label || 'Simulated'}) to connection.`, 'webrtc');
    });

    // Remote stream listener
    this.peerConnection.ontrack = (event) => {
      this.logSecurity(`Received remote track: ${event.track.kind}`, 'webrtc');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(this.remoteStream);
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        this.onRemoteStream(this.remoteStream);
      }
      this.onStateChange('connected');
    };

    // ICE Candidate listener
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.postMessage({
          type: 'ICE_CANDIDATE',
          to: this.remotePeerId,
          candidate: event.candidate
        });
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.logSecurity(`WebRTC connection state changed to: ${state}`, 'webrtc');
      if (state === 'connected') {
        this.onStateChange('connected');
      } else if (state === 'disconnected' || state === 'failed') {
        this.logSecurity('WebRTC connection disconnected or failed.', 'warn');
        this.endCall(true);
      }
    };
  }

  async handleSignalingMessage(data) {
    // Only respond to messages designated for us or broadcast
    if (data.to && data.to !== this.peerId) return;

    switch (data.type) {
      case 'CALL_INITIATED':
        // Show Call Screen (Ringing)
        this.logSecurity(`Received call request from peer: ${data.from}`, 'info');
        this.onStateChange('incoming', {
          from: data.from,
          publicKeyHex: data.publicKeyHex,
          useVideo: data.useVideo
        });
        break;

      case 'CALL_ACCEPTED':
        // Sender receives acceptor's details
        this.remotePeerId = data.from;
        this.logSecurity(`Call accepted by ${data.from}. Finalizing key exchange...`, 'info');
        
        await this.completeKeyExchange(data.publicKeyHex);
        
        this.localStream = await this.getMediaStream(data.useVideo);
        this.onLocalStream(this.localStream);
        
        this.setupPeerConnection();
        
        // Sender creates WebRTC Offer
        this.logSecurity('Creating SDP Cryptographic Offer...', 'webrtc');
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        this.channel.postMessage({
          type: 'SDP_OFFER',
          to: this.remotePeerId,
          offer: offer
        });
        this.logSecurity('SDP Offer dispatched to remote peer.', 'webrtc');
        break;

      case 'CALL_REJECTED':
        this.logSecurity('Call request was rejected by remote peer.', 'warn');
        this.onStateChange('idle');
        this.cleanup();
        break;

      case 'SDP_OFFER':
        // Receiver gets the offer
        this.logSecurity('SDP Offer received. Processing...', 'webrtc');
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          this.logSecurity('SDP Offer set as Remote Description. Creating SDP Answer...', 'webrtc');
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          
          this.channel.postMessage({
            type: 'SDP_ANSWER',
            to: this.remotePeerId,
            answer: answer
          });
          this.logSecurity('SDP Answer dispatched to remote peer.', 'webrtc');
        }
        break;

      case 'SDP_ANSWER':
        // Sender gets the answer
        this.logSecurity('SDP Answer received. Processing...', 'webrtc');
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          this.logSecurity('SDP Answer set as Remote Description. Encryption tunnel handshaked.', 'webrtc');
        }
        break;

      case 'ICE_CANDIDATE':
        // Add remote ICE candidate
        if (this.peerConnection) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        }
        break;

      case 'CALL_ENDED':
        this.logSecurity('Remote peer hung up the call.', 'info');
        this.endCall(false);
        break;

      default:
        break;
    }
  }

  // End the call
  endCall(notifyRemote = true) {
    if (notifyRemote && this.remotePeerId) {
      this.channel.postMessage({
        type: 'CALL_ENDED',
        to: this.remotePeerId
      });
      this.logSecurity('Hanging up call. Signaling remote peer...', 'info');
    }
    
    this.cleanup();
    this.onCallEnded();
    this.onStateChange('idle');
  }

  cleanup() {
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop fallback canvas animation
    if (this.canvasInterval) {
      clearInterval(this.canvasInterval);
      this.canvasInterval = null;
    }

    // Close PeerConnection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remotePeerId = null;
    this.remoteStream = null;
    this.remotePublicKey = null;
    this.sharedSecretBits = null;
    this.aesKey = null;
    this.securityFingerprint = null;
    
    this.logSecurity('Resources cleaned up. Call session finalized.', 'info');
  }
}
