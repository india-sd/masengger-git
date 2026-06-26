import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Phone, 
  Video, 
  Settings, 
  Search, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  Clock, 
  Terminal, 
  Volume2, 
  VolumeX, 
  Camera, 
  CameraOff, 
  Key, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  CheckCheck,
  ToggleLeft,
  ToggleRight,
  Info,
  Network,
  GitBranch
} from 'lucide-react';
import { SecureCallManager } from './webrtc';
import { encryptMessage, decryptMessage } from './crypto';

// Initial contacts list
const INITIAL_CONTACTS = [
  { id: 'boy', name: 'Boy (Chat Bot)', initials: '♂', status: 'online', secure: false, lastMsg: 'Hey! Chat with me.', time: '12:44 PM', unread: 0, avatarBg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' },
  { id: 'girl', name: 'Girl (Chat Bot)', initials: '♀', status: 'online', secure: false, lastMsg: 'Hi there! Let\'s chat.', time: '12:44 PM', unread: 0, avatarBg: 'linear-gradient(135deg, #701a75 0%, #d946ef 100%)' },
  { id: 'alice', name: 'Agent Alice', initials: 'AA', status: 'online', secure: true, lastMsg: '🔒 Secure connection verified.', time: '12:42 PM', unread: 0 },
  { id: 'bob', name: 'Director Bob', initials: 'DB', status: 'online', secure: true, lastMsg: 'Awaiting E2EE session code...', time: '11:15 AM', unread: 1 },
  { id: 'cipher_x', name: 'Cipher-X Node', initials: 'CX', status: 'offline', secure: true, lastMsg: 'Node offline. Sync logs.', time: 'Yesterday', unread: 0 },
  { id: 'hq', name: 'HQ Secure Gate', initials: 'HQ', status: 'online', secure: false, lastMsg: 'Unencrypted backup channel active.', time: 'Monday', unread: 0 }
];

const INITIAL_MESSAGES = {
  boy: [
    { id: 1, sender: 'boy', text: 'Hey there! I am Boy, your friendly chat partner. Ask me anything or let\'s just chat!', time: '12:44 PM', encrypted: false }
  ],
  girl: [
    { id: 1, sender: 'girl', text: 'Hello! I am Girl, your friendly chat partner. Nice to meet you! How is your day going?', time: '12:44 PM', encrypted: false }
  ],
  alice: [
    { id: 1, sender: 'alice', text: 'Hello. Initiating secure channel P-256.', time: '12:35 PM', iv: 'a12f9e4c3d2b', encrypted: false },
    { id: 2, sender: 'me', text: 'Confirmed. Key agreement verified.', time: '12:38 PM', iv: 'e92d8f7c6b5a', encrypted: false },
    { id: 3, sender: 'alice', text: 'Ready for calls. Visual fingerprint comparison active.', time: '12:42 PM', iv: '8f921ea5c372', encrypted: true, ciphertext: '4f2910ab3ed46ef72a0c8b91' }
  ],
  bob: [
    { id: 1, sender: 'bob', text: 'Need a status report over encrypted line.', time: '11:10 AM', iv: '7c2e3d9f1a8b', encrypted: false },
    { id: 2, sender: 'me', text: 'Ready. Call when you have derived the session key.', time: '11:15 AM', iv: '9f2c1d8a7e6b', encrypted: false }
  ],
  cipher_x: [],
  hq: []
};

// Help text list
const SECURITY_TIPS = [
  "WebRTC call media is protected by DTLS-SRTP. The emoji fingerprint verifies signaling integrity against MITM attacks.",
  "Self-destruct timers erase messages completely from the local database after the timer expires.",
  "Camouflage Mode (Calculator) provides plausible deniability. Default PIN to enter the app is 0000.",
  "Web Crypto API (ECDH P-256) is utilized for asymmetric key exchange, deriving a 256-bit AES-GCM session key."
];

// Initial dialogue graphs matching the graphify nodes/edges schema
const INITIAL_DIALOGUE_GRAPHS = {
  boy: {
    nodes: [
      { id: 'greet', label: 'Greet', response: "Hey there! How's it going, buddy? What are you up to today?", x: 300, y: 100 },
      { id: 'status', label: 'Status', response: "I'm doing great! Just hanging out in this secure chat application. How about you?", x: 460, y: 170 },
      { id: 'identity', label: 'Identity', response: "I'm Boy! Your friendly male chatbot companion. Always here for a chat!", x: 460, y: 330 },
      { id: 'help', label: 'Help', response: "I'm here to chat, listen, tell stories, or give opinions. Just type anything you'd like to talk about!", x: 300, y: 400 },
      { id: 'joke', label: 'Joke', response: "Why don't scientists trust atoms? Because they make up everything! | What do you call a fake noodle? An impasta! | Why did the scarecrow win an award? Because he was outstanding in his field!", x: 140, y: 330 },
      { id: 'affection', label: 'Affection', response: "Haha, you are awesome! I really enjoy chatting with you too.", x: 140, y: 170 },
      { id: 'bye', label: 'Bye', response: "Catch you later! Stay safe out there.", x: 300, y: 40 },
      { id: 'fallback', label: 'Fallback', response: "That's interesting! Tell me more about that. | Cool! I get what you mean. | Hmm, I haven't thought about it that way. What else do you think?", x: 300, y: 200 }
    ],
    edges: [
      { source: 'user_input', target: 'greet', relation: 'matches:hello,hi,hey', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'status', relation: 'matches:how are you,how\'s it going', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'identity', relation: 'matches:name,who are you', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'help', relation: 'matches:help,what can you do', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'joke', relation: 'matches:joke', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'affection', relation: 'matches:love,like me', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'bye', relation: 'matches:bye,goodbye', confidence: 'EXTRACTED' }
    ]
  },
  girl: {
    nodes: [
      { id: 'greet', label: 'Greet', response: "Hello! Hope you're having a lovely day. How can I help you today?", x: 300, y: 100 },
      { id: 'status', label: 'Status', response: "I'm doing wonderfully, thank you! It's so nice of you to ask. How are you feeling?", x: 460, y: 170 },
      { id: 'identity', label: 'Identity', response: "I'm Girl! Your friendly female chatbot companion. I'm excited to talk with you!", x: 460, y: 330 },
      { id: 'help', label: 'Help', response: "I love sharing thoughts, discussing books, movies, giving suggestions, or just being a good listener. Feel free to talk about anything!", x: 300, y: 400 },
      { id: 'joke', label: 'Joke', response: "Why did the bicycle fall over? Because it was two-tired! | What do you call a sleeping dinosaur? A dino-snore! | Why are elevator jokes so good? They work on so many levels!", x: 140, y: 330 },
      { id: 'affection', label: 'Affection', response: "Aww, that's sweet! You're a wonderful person, and I'm really glad we're chatting.", x: 140, y: 170 },
      { id: 'bye', label: 'Bye', response: "Goodbye! Have a beautiful rest of your day, and chat soon!", x: 300, y: 40 },
      { id: 'fallback', label: 'Fallback', response: "I see! That sounds fascinating. Please tell me more. | Oh, that's really neat! I'd love to hear more about your day. | Thank you for sharing that with me! How does that make you feel?", x: 300, y: 200 }
    ],
    edges: [
      { source: 'user_input', target: 'greet', relation: 'matches:hello,hi,hey', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'status', relation: 'matches:how are you,how\'s it going', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'identity', relation: 'matches:name,who are you', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'help', relation: 'matches:help,what can you do', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'joke', relation: 'matches:joke', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'affection', relation: 'matches:love,like me', confidence: 'EXTRACTED' },
      { source: 'user_input', target: 'bye', relation: 'matches:bye,goodbye', confidence: 'EXTRACTED' }
    ]
  }
};

// Helper to generate chatbot responses by traversing dialogue graphs
const getBotResponse = (botId, userMessage, graph) => {
  const msg = userMessage.toLowerCase().trim();
  const botGraph = graph[botId];
  if (!botGraph) return "Hello!";
  
  // Find matching edge
  const matchingEdge = botGraph.edges.find(edge => {
    if (edge.relation.startsWith("matches:")) {
      const keywords = edge.relation.replace("matches:", "").split(",");
      return keywords.some(keyword => msg.includes(keyword.trim().toLowerCase()));
    }
    return false;
  });
  
  if (matchingEdge) {
    const targetNode = botGraph.nodes.find(node => node.id === matchingEdge.target);
    if (targetNode) {
      const responses = targetNode.response.split("|");
      return responses[Math.floor(Math.random() * responses.length)].trim();
    }
  }
  
  // Fallback node
  const fallbackNode = botGraph.nodes.find(node => node.id === "fallback");
  if (fallbackNode) {
    const responses = fallbackNode.response.split("|");
    return responses[Math.floor(Math.random() * responses.length)].trim();
  }
  return "That's interesting! Tell me more.";
};

function App() {
  // App Access Lock States
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // Camouflage Mode States
  const [isCamouflaged, setIsCamouflaged] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcInputSequence, setCalcInputSequence] = useState('');
  const [displayClickCount, setDisplayClickCount] = useState(0);

  // Chat & Messaging States
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [selectedContact, setSelectedContact] = useState('boy');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [botTyping, setBotTyping] = useState(null); // 'boy' or 'girl' or null

  // Dialogue Graph Manager States (Graphify integration)
  const [dialogueGraphs, setDialogueGraphs] = useState(INITIAL_DIALOGUE_GRAPHS);
  const [showGraphManager, setShowGraphManager] = useState(false);
  const [botSelectedGraph, setBotSelectedGraph] = useState('boy'); // 'boy' or 'girl'
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState('greet');

  const activeBotGraph = dialogueGraphs[botSelectedGraph];
  const activeNode = activeBotGraph.nodes.find(n => n.id === selectedGraphNodeId) || activeBotGraph.nodes[0];
  const activeEdge = activeBotGraph.edges.find(e => e.target === selectedGraphNodeId);

  const handleUpdateNode = (updatedResponse, updatedLabel, updatedKeywords) => {
    setDialogueGraphs(prev => {
      const newBotGraph = { ...prev[botSelectedGraph] };
      
      newBotGraph.nodes = newBotGraph.nodes.map(node => {
        if (node.id === selectedGraphNodeId) {
          return { ...node, response: updatedResponse, label: updatedLabel };
        }
        return node;
      });
      
      if (activeEdge && updatedKeywords !== undefined) {
        newBotGraph.edges = newBotGraph.edges.map(edge => {
          if (edge.target === selectedGraphNodeId) {
            return { ...edge, relation: `matches:${updatedKeywords}` };
          }
          return edge;
        });
      }
      
      return {
        ...prev,
        [botSelectedGraph]: newBotGraph
      };
    });
  };
  
  // Hover decryption simulation states
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [hoverScrambleText, setHoverScrambleText] = useState('');

  // Call Settings & Controls
  const [selfDestructSec, setSelfDestructSec] = useState(0); // 0 means off
  const [videoFilter, setVideoFilter] = useState('none'); // none, blur, night, mono
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // WebRTC Call Manager Instance & States
  const [callState, setCallState] = useState('idle'); // idle, dialing, incoming, connecting, connected
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callEmojis, setCallEmojis] = useState([]);
  const [callChecksum, setCallChecksum] = useState('');
  const [securityLogs, setSecurityLogs] = useState([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [showHandshakeAnimation, setShowHandshakeAnimation] = useState(false);

  // Stats Simulation
  const [callStats, setCallStats] = useState({
    latency: '12ms',
    packetLoss: '0.0%',
    cipher: 'SRTP_AESGCM_256',
    fps: '30 FPS',
    kbps: '480 kbps'
  });

  // Media references
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callManagerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact]);

  // Log to UI console helper
  const addSecurityLog = (log) => {
    setSecurityLogs(prev => [log, ...prev].slice(0, 50));
  };

  // Setup Call Manager
  useEffect(() => {
    callManagerRef.current = new SecureCallManager({
      onStateChange: (state, extraData) => {
        setCallState(state);
        if (state === 'incoming' && extraData) {
          setIncomingCallData(extraData);
        }
        if (state === 'connecting') {
          setShowHandshakeAnimation(true);
          // Hide handshake animation after 2.5s and complete visual transition
          setTimeout(() => {
            setShowHandshakeAnimation(false);
          }, 2500);
        }
      },
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onRemoteStream: (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onSecurityLog: (log) => {
        addSecurityLog(log);
      },
      onFingerprintReady: (fingerprint) => {
        setCallEmojis(fingerprint.emojis);
        setCallChecksum(fingerprint.checksum);
      },
      onCallEnded: () => {
        setCallEmojis([]);
        setCallChecksum('');
        setIncomingCallData(null);
      }
    });

    addSecurityLog({
      timestamp: new Date().toLocaleTimeString(),
      message: 'Cryptographic core initialized. Web Crypto API active.',
      type: 'crypto'
    });

    return () => {
      if (callManagerRef.current) {
        callManagerRef.current.cleanup();
      }
    };
  }, []);

  // Update Media elements if callState changes
  useEffect(() => {
    if (callState === 'connected' || callState === 'connecting') {
      const manager = callManagerRef.current;
      if (manager) {
        if (localVideoRef.current && manager.localStream) {
          localVideoRef.current.srcObject = manager.localStream;
        }
        if (remoteVideoRef.current && manager.remoteStream) {
          remoteVideoRef.current.srcObject = manager.remoteStream;
        }
      }
    }
  }, [callState]);

  // Simulated Stats Updates during Call
  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallStats({
          latency: `${Math.floor(8 + Math.random() * 8)}ms`,
          packetLoss: `${(Math.random() * 0.1).toFixed(2)}%`,
          cipher: 'SRTP_AESGCM_256',
          fps: `${Math.floor(28 + Math.random() * 4)} FPS`,
          kbps: `${Math.floor(450 + Math.random() * 60)} kbps`
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Synchronize contact list previews with actual message history
  useEffect(() => {
    setContacts(prevContacts => 
      prevContacts.map(contact => {
        const contactMsgs = messages[contact.id] || [];
        if (contactMsgs.length > 0) {
          const lastMsgObj = contactMsgs[contactMsgs.length - 1];
          return {
            ...contact,
            lastMsg: lastMsgObj.encrypted ? '🔒 [Encrypted Message]' : lastMsgObj.text,
            time: lastMsgObj.time
          };
        }
        return contact;
      })
    );
  }, [messages]);

  // Lock Screen Keypad Input Handler
  const handlePinPress = (val) => {
    if (pinInput.length < 4) {
      const newVal = pinInput + val;
      setPinInput(newVal);
      if (newVal.length === 4) {
        // Evaluate PIN code (Default PIN is 0000)
        if (newVal === '0000') {
          setIsLocked(false);
          setPinInput('');
          addSecurityLog({
            timestamp: new Date().toLocaleTimeString(),
            message: 'App authenticated. Passcode matches.',
            type: 'info'
          });
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinInput('');
            setPinError(false);
          }, 600);
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  // Calculator (Camouflage Mode) logic
  const handleCalcBtn = (value) => {
    if (value === 'C') {
      setCalcDisplay('0');
      setCalcInputSequence('');
    } else if (value === '=') {
      try {
        // Secure camouflage escape sequence: enter '1337' and press '='
        if (calcInputSequence === '1337') {
          setIsCamouflaged(false);
          setCalcDisplay('0');
          setCalcInputSequence('');
          addSecurityLog({
            timestamp: new Date().toLocaleTimeString(),
            message: 'Camouflage bypassed. Resuming normal session.',
            type: 'info'
          });
          return;
        }

        // Evaluate math safely (avoid eval)
        const sanitizedSeq = calcInputSequence.replace(/×/g, '*').replace(/÷/g, '/');
        // Simple regex expression solver for safety
        if (/^[0-9.+\-*/\s]+$/.test(sanitizedSeq)) {
          const result = new Function(`return ${sanitizedSeq}`)();
          setCalcDisplay(String(result));
          setCalcInputSequence(String(result));
        } else {
          setCalcDisplay('Error');
        }
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      let nextSeq = calcInputSequence;
      if (calcDisplay === '0' || calcDisplay === 'Error') {
        setCalcDisplay(value);
        nextSeq = value;
      } else {
        setCalcDisplay(prev => prev + value);
        nextSeq = calcInputSequence + value;
      }
      setCalcInputSequence(nextSeq);
    }
  };

  // Hidden Click Escape on Calculator
  const handleCalcDisplayClick = () => {
    const nextCount = displayClickCount + 1;
    setDisplayClickCount(nextCount);
    if (nextCount >= 3) {
      setIsCamouflaged(false);
      setDisplayClickCount(0);
      addSecurityLog({
        timestamp: new Date().toLocaleTimeString(),
        message: 'Calculator clicks bypass triggered.',
        type: 'info'
      });
    }
  };

  // E2EE Text sending simulation
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const manager = callManagerRef.current;
    let isEncrypted = false;
    let iv = '';
    let ciphertext = '';
    let displayText = inputText;

    // Check if we are connected in a call, if so encrypt using our E2EE AES key
    if (callState === 'connected' && manager && manager.aesKey) {
      try {
        isEncrypted = true;
        const encrypted = await encryptMessage(inputText, manager.aesKey);
        iv = encrypted.iv;
        ciphertext = encrypted.ciphertext;
        displayText = inputText; // Store plaintext locally for UI
        addSecurityLog({
          timestamp: new Date().toLocaleTimeString(),
          message: `E2EE Encryption completed. Text payload: "${inputText}" -> AES-GCM-256 [IV: ${iv.substring(0, 8)}...]`,
          type: 'crypto'
        });
      } catch (err) {
        console.error('Encryption error', err);
      }
    }

    const newMessageId = Date.now();
    const newMsg = {
      id: newMessageId,
      sender: 'me',
      text: displayText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      encrypted: isEncrypted,
      iv: iv || 'N/A',
      ciphertext: ciphertext || null,
      selfDestruct: selfDestructSec > 0 ? selfDestructSec : null
    };

    // Add to message history
    setMessages(prev => ({
      ...prev,
      [selectedContact]: [...(prev[selectedContact] || []), newMsg]
    }));

    setInputText('');

    // Chatbot response trigger
    if (selectedContact === 'boy' || selectedContact === 'girl') {
      const userMsgText = inputText;
      const botId = selectedContact;
      
      // Delay before typing indicator
      setTimeout(() => {
        setBotTyping(botId);
        
        // Delay before response message
        setTimeout(() => {
          setBotTyping(null);
          
          const botReplyText = getBotResponse(botId, userMsgText, dialogueGraphs);
          const botMessage = {
            id: Date.now(),
            sender: botId,
            text: botReplyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            encrypted: false,
            iv: 'N/A',
            ciphertext: null
          };
          
          setMessages(prev => ({
            ...prev,
            [botId]: [...(prev[botId] || []), botMessage]
          }));
          
          addSecurityLog({
            timestamp: new Date().toLocaleTimeString(),
            message: `Received response from Chat Bot ${botId === 'boy' ? 'Boy' : 'Girl'}.`,
            type: 'info'
          });
        }, 1200);
      }, 300);
    }

    // If self-destruct is set, launch a timer
    if (selfDestructSec > 0) {
      addSecurityLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `Self-destruct timer initialized for message: ${selfDestructSec}s.`,
        type: 'info'
      });

      setTimeout(() => {
        setMessages(prev => ({
          ...prev,
          [selectedContact]: prev[selectedContact].filter(m => m.id !== newMessageId)
        }));
        addSecurityLog({
          timestamp: new Date().toLocaleTimeString(),
          message: `Self-destruct timer triggered. Message ${newMessageId} deleted permanently.`,
          type: 'warn'
        });
      }, selfDestructSec * 1000);
    }

    // Broadcast message to other tab if in E2EE calling state
    if (callState === 'connected' && manager) {
      manager.channel.postMessage({
        type: 'E2EE_TEXT_MESSAGE',
        from: manager.peerId,
        ciphertext,
        iv,
        selfDestruct: selfDestructSec > 0 ? selfDestructSec : null
      });
    }
  };

  // Hook signaling channel for decrypted messages from incoming streams
  useEffect(() => {
    const handleE2EEMessages = async (event) => {
      const data = event.data;
      const manager = callManagerRef.current;
      if (data.type === 'E2EE_TEXT_MESSAGE' && manager && manager.aesKey) {
        try {
          addSecurityLog({
            timestamp: new Date().toLocaleTimeString(),
            message: `Received E2EE payload: Ciphertext: ${data.ciphertext.substring(0, 16)}... | IV: ${data.iv.substring(0, 8)}...`,
            type: 'crypto'
          });

          // Decrypt payload
          const plaintext = await decryptMessage(data.ciphertext, data.iv, manager.aesKey);
          
          addSecurityLog({
            timestamp: new Date().toLocaleTimeString(),
            message: `AES-256-GCM decryption successful. Decrypted message content: "${plaintext}"`,
            type: 'crypto'
          });

          const incomingMsgId = Date.now();
          const newMsg = {
            id: incomingMsgId,
            sender: selectedContact,
            text: plaintext,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            encrypted: true,
            iv: data.iv,
            ciphertext: data.ciphertext,
            selfDestruct: data.selfDestruct
          };

          setMessages(prev => ({
            ...prev,
            [selectedContact]: [...(prev[selectedContact] || []), newMsg]
          }));

          if (data.selfDestruct) {
            setTimeout(() => {
              setMessages(prev => ({
                ...prev,
                [selectedContact]: prev[selectedContact].filter(m => m.id !== incomingMsgId)
              }));
              addSecurityLog({
                timestamp: new Date().toLocaleTimeString(),
                message: `Self-destruct timer triggered. Remote message deleted.`,
                type: 'warn'
              });
            }, data.selfDestruct * 1000);
          }

        } catch (err) {
          addSecurityLog({
            timestamp: new Date().toLocaleTimeString(),
            message: 'E2EE Decryption Failed. Check integrity keys.',
            type: 'error'
          });
        }
      }
    };

    if (callManagerRef.current) {
      callManagerRef.current.channel.addEventListener('message', handleE2EEMessages);
    }
    return () => {
      if (callManagerRef.current) {
        callManagerRef.current.channel.removeEventListener('message', handleE2EEMessages);
      }
    };
  }, [selectedContact, callState]);

  // Initiate Call
  const handleInitiateCall = (useVideo = true) => {
    if (callManagerRef.current) {
      callManagerRef.current.startCall(useVideo);
    }
  };

  // Reject Incoming Call
  const handleRejectCall = () => {
    if (callManagerRef.current && incomingCallData) {
      callManagerRef.current.rejectCall(incomingCallData.from);
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = () => {
    if (callManagerRef.current && incomingCallData) {
      callManagerRef.current.acceptCall(incomingCallData.from, incomingCallData.publicKeyHex, incomingCallData.useVideo);
    }
  };

  // Hangup call
  const handleHangup = () => {
    if (callManagerRef.current) {
      callManagerRef.current.endCall(true);
    }
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (callManagerRef.current && callManagerRef.current.localStream) {
      const audioTrack = callManagerRef.current.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        addSecurityLog({
          timestamp: new Date().toLocaleTimeString(),
          message: `Microphone output ${audioTrack.enabled ? 'enabled' : 'disabled (muted)'}.`,
          type: 'info'
        });
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (callManagerRef.current && callManagerRef.current.localStream) {
      const videoTrack = callManagerRef.current.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        addSecurityLog({
          timestamp: new Date().toLocaleTimeString(),
          message: `Camera output ${videoTrack.enabled ? 'enabled' : 'disabled (video muted)'}.`,
          type: 'info'
        });
      }
    }
  };

  // Simulated decryption text reveal on hover
  const startHoverScramble = (message) => {
    setHoveredMessageId(message.id);
    let counter = 0;
    const interval = setInterval(() => {
      const randomChars = '!@#$%^&*()_+{}|:"<>?-=[]\\;\',./';
      let result = '';
      for (let i = 0; i < message.text.length; i++) {
        if (Math.random() < 0.3 && counter < 8) {
          result += randomChars[Math.floor(Math.random() * randomChars.length)];
        } else {
          result += message.text[i];
        }
      }
      setHoverScrambleText(result);
      counter++;
      if (counter > 10) {
        clearInterval(interval);
        setHoverScrambleText(message.text);
      }
    }, 40);
  };

  const endHoverScramble = () => {
    setHoveredMessageId(null);
    setHoverScrambleText('');
  };

  // Search filter
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContactObj = contacts.find(c => c.id === selectedContact) || contacts[0];

  return (
    <div className="app-container">
      {/* 1. PASSCODE LOCKED SCREEN */}
      {isLocked && (
        <div className="lock-screen">
          <div className="lock-container glass glass-card">
            <div className="lock-icon-glow">
              <Shield size={36} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)' }}>Enter Access PIN</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              A secure 4-digit PIN secures your workspace.
            </p>
            <div className="lock-indicator">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`lock-dot ${pinInput.length > idx ? 'active' : ''} ${pinError ? 'error' : ''}`} 
                />
              ))}
            </div>
            <div className="keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                <button key={val} className="keypad-btn" onClick={() => handlePinPress(String(val))}>
                  {val}
                </button>
              ))}
              <button className="keypad-btn" style={{ fontSize: '0.8rem', color: 'var(--accent-ruby)' }} onClick={() => setPinInput('')}>
                Clear
              </button>
              <button className="keypad-btn" onClick={() => handlePinPress('0')}>
                0
              </button>
              <button className="keypad-btn" style={{ fontSize: '0.9rem' }} onClick={handlePinDelete}>
                ⌫
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              Default developer PIN code: <span style={{ color: 'var(--accent-cyan)' }}>0000</span>
            </p>
          </div>
        </div>
      )}

      {/* 2. CAMOUFLAGE MODE (CALCULATOR DISGUISE) */}
      {isCamouflaged && !isLocked && (
        <div className="calc-screen" onClick={(e) => e.stopPropagation()}>
          <div className="calculator">
            <div className="calc-display" onClick={handleCalcDisplayClick}>
              {calcDisplay}
            </div>
            <div className="calc-grid">
              <button className="calc-btn gray" onClick={() => handleCalcBtn('C')}>AC</button>
              <button className="calc-btn gray" onClick={() => handleCalcBtn('+/-')}>±</button>
              <button className="calc-btn gray" onClick={() => handleCalcBtn('%')}>%</button>
              <button className="calc-btn orange" onClick={() => handleCalcBtn('/')}>÷</button>

              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('7')}>7</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('8')}>8</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('9')}>9</button>
              <button className="calc-btn orange" onClick={() => handleCalcBtn('*')}>×</button>

              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('4')}>4</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('5')}>5</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('6')}>6</button>
              <button className="calc-btn orange" onClick={() => handleCalcBtn('-')}>-</button>

              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('1')}>1</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('2')}>2</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('3')}>3</button>
              <button className="calc-btn orange" onClick={() => handleCalcBtn('+')}>+</button>

              <button className="calc-btn dark-gray double" onClick={() => handleCalcBtn('0')}>0</button>
              <button className="calc-btn dark-gray" onClick={() => handleCalcBtn('.')}>.</button>
              <button className="calc-btn orange" onClick={() => handleCalcBtn('=')}>=</button>
            </div>
            <p style={{ color: '#555', fontSize: '0.7rem', textAlign: 'center', marginTop: '16px' }}>
              Press display 3x to exit camouflage mode.
            </p>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD */}
      {!isLocked && !isCamouflaged && (
        <div className="dashboard">
          
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-logo">
                <div className="sidebar-logo-title">
                  <Shield size={20} className="secure-badge" style={{ color: 'var(--accent-emerald)' }} />
                  <span>The Chat</span>Bot
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="icon-btn" 
                    title="Dialogue Graph Manager" 
                    onClick={() => setShowGraphManager(true)}
                    style={{ borderColor: 'var(--accent-cyan)' }}
                  >
                    <Network size={16} style={{ color: 'var(--accent-cyan)' }} />
                  </button>
                  <button 
                    className="icon-btn" 
                    title="Lock Application" 
                    onClick={() => setIsLocked(true)}
                  >
                    <Lock size={16} />
                  </button>
                  <button 
                    className="icon-btn" 
                    title="Camouflage Mode (Disguise)" 
                    onClick={() => setIsCamouflaged(true)}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
              <div className="search-bar">
                <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="Search secure channels..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="chat-list">
              {filteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className={`chat-item ${selectedContact === contact.id ? 'active' : ''}`}
                  onClick={() => setSelectedContact(contact.id)}
                >
                  <div className="avatar-container">
                    <div 
                      className="avatar" 
                      style={contact.avatarBg ? { background: contact.avatarBg } : {}}
                    >
                      {contact.initials}
                    </div>
                    <div className={`status-badge ${contact.status === 'offline' ? 'offline' : ''}`} />
                  </div>
                  <div className="chat-details">
                    <div className="chat-name-row">
                      <div className="chat-name">{contact.name}</div>
                      <div className="chat-time">{contact.time}</div>
                    </div>
                    <div className="chat-message-row">
                      <div className={`chat-preview ${contact.secure ? 'encrypted' : ''}`}>
                        {contact.secure && <Shield size={10} />}
                        {contact.lastMsg}
                      </div>
                      {contact.unread > 0 && <span className="unread-badge">{contact.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                <Shield size={14} /> E2EE Cryptography Verified
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-tertiary)' }}>
                Session: {callManagerRef.current ? callManagerRef.current.peerId.toUpperCase() : 'CONNECTING...'}
              </p>
            </div>
          </div>

          {/* CHAT PANEL VIEW */}
          <div className="chat-view">
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="avatar-container">
                  <div 
                    className="avatar" 
                    style={activeContactObj.avatarBg ? { background: activeContactObj.avatarBg } : {}}
                  >
                    {activeContactObj.initials}
                  </div>
                  <div className={`status-badge ${activeContactObj.status === 'offline' ? 'offline' : ''}`} />
                </div>
                <div className="chat-header-meta">
                  <h3>{activeContactObj.name}</h3>
                  <p>
                    <Shield size={12} /> 
                    {activeContactObj.secure ? 'End-to-End Encrypted Link' : 'Standard Connection'}
                  </p>
                </div>
              </div>
              
              <div className="chat-header-actions">
                <button 
                  className="icon-btn" 
                  title="Security Logs & Cryptographic Console"
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  style={{ borderColor: 'var(--accent-cyan)' }}
                >
                  <Terminal size={18} style={{ color: 'var(--accent-cyan)' }} />
                </button>
                
                {activeContactObj.secure && (
                  <>
                    <button 
                      className="btn btn-cyan" 
                      onClick={() => handleInitiateCall(false)}
                      disabled={callState !== 'idle' || activeContactObj.status === 'offline'}
                    >
                      <Phone size={16} /> Encrypted Call
                    </button>
                    <button 
                      className="btn btn-emerald" 
                      onClick={() => handleInitiateCall(true)}
                      disabled={callState !== 'idle' || activeContactObj.status === 'offline'}
                    >
                      <Video size={16} /> Secure Video
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* MESSAGES HISTORY */}
            <div className="message-pane">
              {messages[selectedContact]?.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px' }}>
                  <Shield size={48} style={{ marginBottom: '16px', color: 'var(--glass-border)' }} />
                  <h4>Secure Chat Initialized</h4>
                  <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                    Symmetric session keys will automatically encrypt all payload traffic.
                  </p>
                </div>
              ) : (
                messages[selectedContact]?.map((msg) => {
                  const isHovered = hoveredMessageId === msg.id;
                  return (
                    <div key={msg.id} className={`message-bubble-wrapper ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                      <div 
                        className="message-bubble"
                        onMouseEnter={() => msg.encrypted && startHoverScramble(msg)}
                        onMouseLeave={() => msg.encrypted && endHoverScramble()}
                      >
                        {msg.encrypted ? (
                          <div className="ciphertext-container">
                            <span 
                              className="ciphertext-hoverable" 
                              title="Click to view encrypted details"
                            >
                              {isHovered ? hoverScrambleText : `[AES-GCM: ${msg.ciphertext ? msg.ciphertext.substring(0, 12) : ''}... Hover to decrypt]`}
                            </span>
                          </div>
                        ) : (
                          msg.text
                        )}
                        
                        <div className="message-info">
                          <span>{msg.time}</span>
                          {msg.sender === 'me' ? (
                            <CheckCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
                          ) : null}
                          {msg.selfDestruct && (
                            <span className="self-destruct-timer" title="Message is self destructing">
                              <Clock size={10} /> {msg.selfDestruct}s
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {msg.encrypted && (
                        <div className="message-crypto-tag">
                          <Shield size={10} /> AES-256-GCM | IV: {msg.iv.substring(0, 10)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {botTyping === selectedContact && (
                <div className="message-bubble-wrapper received">
                  <div className="typing-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* MESSAGE INPUT BAR */}
            <div className="chat-footer">
              <form onSubmit={handleSendMessage}>
                <div className="input-container">
                  <input 
                    type="text" 
                    placeholder={
                      callState === 'connected' 
                        ? "Message encrypting in transit with AES-256-GCM..." 
                        : "Type a secure message..."
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <div className="input-actions">
                    <button 
                      type="button" 
                      className={`self-destruct-btn ${selfDestructSec > 0 ? 'active' : ''}`}
                      onClick={() => setSelfDestructSec(prev => {
                        if (prev === 0) return 5;
                        if (prev === 5) return 10;
                        if (prev === 10) return 30;
                        return 0;
                      })}
                      title="Self Destruct Timer"
                    >
                      <Clock size={14} /> 
                      {selfDestructSec > 0 ? `${selfDestructSec}s` : 'Off'}
                    </button>
                    
                    <button type="submit" className="icon-btn active">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. REAL-TIME P2P WEBRTC CALL DRAWER OVERLAY */}
      {callState !== 'idle' && (
        <div className="call-overlay">
          
          {/* Main workspace */}
          <div className="call-workspace">
            <div className="call-header">
              <div className="call-title-info">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield style={{ color: 'var(--accent-emerald)' }} /> 
                  Calling {activeContactObj.name}
                </h2>
                <div className="secure-call-tag">
                  <Shield size={14} /> END-TO-END ENCRYPTED P2P
                </div>
              </div>
              <div>
                <button 
                  className="icon-btn" 
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  style={{ borderColor: 'var(--accent-cyan)' }}
                >
                  <Terminal size={18} style={{ color: 'var(--accent-cyan)' }} />
                </button>
              </div>
            </div>

            {/* CALL STATE RENDERING */}
            {callState === 'dialing' && (
              <div className="dialing-container">
                <div className="pulsing-avatar-ring">
                  <div 
                    className="avatar-placeholder" 
                    style={activeContactObj.avatarBg ? { background: activeContactObj.avatarBg } : {}}
                  >
                    {activeContactObj.initials}
                  </div>
                  <div className="pulsing-ring" />
                </div>
                <div className="call-status-subtitle">DIALING SECURE CHANNEL...</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Setting up ECDH (P-256) public key exchanges with other client.
                </p>
              </div>
            )}

            {callState === 'incoming' && (
              <div className="dialing-container">
                <div className="pulsing-avatar-ring">
                  <div 
                    className="avatar-placeholder" 
                    style={activeContactObj.avatarBg ? { background: activeContactObj.avatarBg } : {}}
                  >
                    {activeContactObj.initials}
                  </div>
                  <div className="pulsing-ring" style={{ borderColor: 'var(--accent-yellow)' }} />
                </div>
                <div className="call-status-subtitle" style={{ color: 'var(--accent-yellow)' }}>
                  INCOMING SECURE CALL...
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Crypto Exchange: Key Offered by Remote Session.
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <button className="btn btn-emerald" onClick={handleAcceptCall}>
                    <Check size={16} /> Accept Call
                  </button>
                  <button className="btn btn-danger" onClick={handleRejectCall}>
                    <VolumeX size={16} /> Decline
                  </button>
                </div>
              </div>
            )}

            {(callState === 'connecting' || callState === 'connected') && (
              <div className="call-screens-layout">
                {/* Remote Video (Main background) */}
                <div className="video-frame-wrapper">
                  <video 
                    ref={remoteVideoRef} 
                    className={
                      videoFilter === 'blur' ? 'filter-blur' : 
                      videoFilter === 'night' ? 'filter-night' :
                      videoFilter === 'mono' ? 'filter-mono' : ''
                    }
                    autoPlay 
                    playsInline 
                  />
                  <div className="video-label">
                    <Shield size={14} style={{ color: 'var(--accent-emerald)' }} /> 
                    Remote E2EE Feed ({activeContactObj.name})
                  </div>
                </div>

                {/* Local Video (Floating box) */}
                <div className="video-frame-wrapper pip">
                  <video ref={localVideoRef} autoPlay playsInline muted />
                  <div className="video-label" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    Local Feed
                  </div>
                </div>
              </div>
            )}

            {/* CALL CONTROLS */}
            <div className="call-footer-bar">
              <button 
                className={`circle-call-btn ${isMuted ? 'active' : ''}`} 
                onClick={toggleMute}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              <button 
                className={`circle-call-btn ${isCameraOff ? 'active' : ''}`} 
                onClick={toggleCamera}
                title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
              </button>

              {callState === 'connected' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['none', 'blur', 'night', 'mono'].map((filter) => (
                    <button 
                      key={filter} 
                      className={`btn ${videoFilter === filter ? 'btn-cyan' : ''}`}
                      onClick={() => setVideoFilter(filter)}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      {filter.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              <button className="circle-call-btn danger" onClick={handleHangup} title="End call">
                <VolumeX size={20} />
              </button>
            </div>

          </div>

          {/* CALL EMOJI FINGERPRINT PANEL */}
          <div className="security-fingerprint-panel">
            <div className="security-box-header">
              <h4>
                <Shield size={18} style={{ color: 'var(--accent-emerald)' }} /> 
                Security Verification
              </h4>
            </div>

            <p className="security-instructions">
              To verify this connection is 100% secure with no Man-in-the-Middle active, compare these 4 emojis with the person on the other end.
            </p>

            {callEmojis.length > 0 ? (
              <>
                <div className="emoji-showcase">
                  {callEmojis.map((emoji, idx) => (
                    <div key={idx} className="emoji-item">
                      {emoji}
                    </div>
                  ))}
                </div>
                <div className="security-checksum">
                  HASH: {callChecksum}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                <Key size={32} style={{ animation: 'float 2s infinite ease-in-out', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.8rem' }}>Generating cryptographic handshake fingerprints...</p>
              </div>
            )}

            <div className="cipher-info-box">
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={14} /> Cipher Specifications
              </div>
              <div className="cipher-stat-row">
                <span>Key Agreement</span>
                <span>ECDH P-256</span>
              </div>
              <div className="cipher-stat-row">
                <span>Symmetric Key</span>
                <span>AES-GCM-256</span>
              </div>
              <div className="cipher-stat-row">
                <span>Media Auth</span>
                <span>DTLS-SRTP-SHA1</span>
              </div>
              <div className="cipher-stat-row">
                <span>Connection</span>
                <span>P2P (STUN)</span>
              </div>
              <div className="cipher-stat-row">
                <span>Bitrate</span>
                <span>{callStats.kbps}</span>
              </div>
              <div className="cipher-stat-row">
                <span>Latency</span>
                <span>{callStats.latency}</span>
              </div>
              <div className="cipher-stat-row">
                <span>Loss Rate</span>
                <span>{callStats.packetLoss}</span>
              </div>
            </div>

            <div style={{ border: '1px solid rgba(255, 23, 68, 0.2)', background: 'rgba(255, 23, 68, 0.05)', borderRadius: 'var(--border-radius-md)', padding: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={24} style={{ color: 'var(--accent-ruby)', flexShrink: 0 }} />
              <div>
                If emojis do not match exactly, disconnect immediately. An interception is detected.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. CRYPTO HANDSHAKE FLOW DIAGRAM (DURING CONNECTION SETUP) */}
      {showHandshakeAnimation && (
        <div className="handshake-modal">
          <div className="handshake-card glass glass-card">
            <div style={{ color: 'var(--accent-cyan)', display: 'flex', justifyContent: 'center' }}>
              <Shield size={40} style={{ animation: 'float 2s infinite' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              Establishing Cryptographic Tunnel
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Performing Elliptic Curve Diffie-Hellman Key Exchange (ECDH P-256)
            </p>
            
            <div className="handshake-visualizer">
              <div className="handshake-node">
                <div className="handshake-node-avatar">Me</div>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>Alice</span>
              </div>
              
              <div className="handshake-line-container">
                <div className="handshake-pulse" />
                <div className="handshake-pulse reverse" style={{ animationDelay: '1s' }} />
              </div>
              
              <div className="handshake-node">
                <div className="handshake-node-avatar" style={{ borderColor: 'var(--accent-emerald)' }}>Peer</div>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>Bob</span>
              </div>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-emerald)', background: 'rgba(0, 0, 0, 0.3)', padding: '8px', borderRadius: '4px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>[Client] Generated ECDH public key (P-256)</div>
              <div>[Tunnel] Exchanging SPKI structures...</div>
              <div>[Crypto] Computing shared secret bits...</div>
              <div>[Session] Deriving symmetric AES-256-GCM parameters...</div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SLIDING SECURITY LOG TRAYS (CRYPTO / WEBRTC AUDIT TRAIL) */}
      <div className={`security-console-tray ${isConsoleOpen ? 'open' : ''}`}>
        <div className="security-console-header">
          <h4>
            <Terminal size={14} /> 
            Cryptographic Audit & Signaling Console
          </h4>
          <button className="icon-btn" onClick={() => setIsConsoleOpen(false)}>
            Close (✖)
          </button>
        </div>
        <div className="security-console-logs">
          {securityLogs.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', padding: '8px' }}>
              No audit logs captured. Initiate calling or type messages to capture events.
            </div>
          ) : (
            securityLogs.map((log, idx) => (
              <div key={idx} className={`log-item ${log.type}`}>
                <span className="log-timestamp">[{log.timestamp}]</span>
                <span className="log-text">
                  <strong>[{log.type.toUpperCase()}]</strong> {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 7. DIALOGUE GRAPH MANAGER OVERLAY */}
      {showGraphManager && (
        <div className="graph-manager-overlay">
          <div className="graph-manager-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Network size={22} style={{ color: 'var(--accent-cyan)' }} />
              <h2 style={{ fontSize: '1.25rem' }}>Dialogue Graph Manager <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>| Graphify Engine</span></h2>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Bot selection buttons */}
              <div style={{ display: 'flex', background: 'var(--bg-dark-secondary)', padding: '4px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                <button 
                  className={`btn ${botSelectedGraph === 'boy' ? 'btn-cyan' : ''}`}
                  onClick={() => { setBotSelectedGraph('boy'); setSelectedGraphNodeId('greet'); }}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '4px', border: 'none' }}
                >
                  ♂ Boy Bot
                </button>
                <button 
                  className={`btn ${botSelectedGraph === 'girl' ? 'btn-cyan' : ''}`}
                  onClick={() => { setBotSelectedGraph('girl'); setSelectedGraphNodeId('greet'); }}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '4px', border: 'none' }}
                >
                  ♀ Girl Bot
                </button>
              </div>
              
              <button className="btn" onClick={() => setShowGraphManager(false)}>
                Close (✖)
              </button>
            </div>
          </div>
          
          <div className="graph-editor-split">
            {/* SVG Graph Visualization */}
            <div className="graph-canvas-container">
              <svg viewBox="0 0 600 500">
                <defs>
                  <marker 
                    id="arrow" 
                    viewBox="0 0 10 10" 
                    refX="20" 
                    refY="5" 
                    markerWidth="6" 
                    markerHeight="6" 
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 255, 255, 0.4)" />
                  </marker>
                </defs>
                
                {/* Visual grid pattern background */}
                <rect width="100%" height="100%" fill="none" />
                
                {/* Draw transition edges */}
                {activeBotGraph.edges.map((edge, index) => {
                  const targetNode = activeBotGraph.nodes.find(n => n.id === edge.target);
                  if (!targetNode) return null;
                  
                  const x1 = 300;
                  const y1 = 280;
                  const x2 = targetNode.x;
                  const y2 = targetNode.y;
                  const angle = Math.atan2(y2 - y1, x2 - x1);
                  const lineX2 = x2 - 28 * Math.cos(angle);
                  const lineY2 = y2 - 28 * Math.sin(angle);
                  
                  const keywords = edge.relation.replace("matches:", "");
                  
                  return (
                    <g key={index}>
                      <line 
                        x1={x1} 
                        y1={y1} 
                        x2={lineX2} 
                        y2={lineY2} 
                        className="graph-edge-line" 
                        markerEnd="url(#arrow)"
                      />
                      <text 
                        x={(x1 + x2) / 2} 
                        y={(y1 + y2) / 2 - 6}
                        fill="var(--text-secondary)"
                        fontSize="8"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        {keywords.split(",")[0]}
                      </text>
                    </g>
                  );
                })}
                
                {/* Draw fallback edge */}
                {(() => {
                  const targetNode = activeBotGraph.nodes.find(n => n.id === 'fallback');
                  if (targetNode) {
                    const x1 = 300;
                    const y1 = 280;
                    const x2 = targetNode.x;
                    const y2 = targetNode.y;
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const lineX2 = x2 - 28 * Math.cos(angle);
                    const lineY2 = y2 - 28 * Math.sin(angle);
                    return (
                      <g>
                        <line 
                          x1={x1} 
                          y1={y1} 
                          x2={lineX2} 
                          y2={lineY2} 
                          className="graph-edge-line" 
                          strokeDasharray="4 4"
                          markerEnd="url(#arrow)"
                        />
                        <text 
                          x={(x1 + x2) / 2} 
                          y={(y1 + y2) / 2 - 6}
                          fill="var(--accent-yellow)"
                          fontSize="8"
                          fontFamily="var(--font-mono)"
                          textAnchor="middle"
                        >
                          fallback
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
                
                {/* Draw user input central node */}
                <g transform="translate(300, 280)">
                  <circle cx={0} cy={0} r={28} className="graph-node-circle user-input-node" />
                  <text x={0} y={4} className="graph-node-text" style={{ fill: 'var(--accent-emerald)', fontWeight: 600, fontSize: '10px' }}>User Msg</text>
                </g>
                
                {/* Draw dialogue state nodes */}
                {activeBotGraph.nodes.map(node => {
                  const isSelected = selectedGraphNodeId === node.id;
                  const isFallback = node.id === 'fallback';
                  return (
                    <g 
                      key={node.id} 
                      onClick={() => setSelectedGraphNodeId(node.id)}
                      transform={`translate(${node.x}, ${node.y})`}
                    >
                      <circle 
                        cx={0} 
                        cy={0} 
                        r={26} 
                        className={`graph-node-circle ${isSelected ? 'selected' : ''} ${isFallback ? 'fallback' : ''}`} 
                      />
                      <text 
                        x={0} 
                        y={4} 
                        className="graph-node-text"
                        style={{ fontSize: '9px' }}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
              
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)' }}></span> User Message Entry Point
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--cb-color)' }}></span> Dialogue State (Click to edit)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-yellow)' }}></span> Default Fallback State
                </span>
              </div>
            </div>
            
            {/* Dialogue Node Editor Pane */}
            <div className="graph-form-pane">
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}>
                  <GitBranch size={18} /> Edit Node: {activeNode.id.toUpperCase()}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Adjust conversation triggers and response text for this state.
                </p>
              </div>
              
              <div className="form-group">
                <label>State Label</label>
                <input 
                  type="text" 
                  value={activeNode.label}
                  onChange={(e) => handleUpdateNode(activeNode.response, e.target.value, activeEdge ? activeEdge.relation.replace("matches:", "") : undefined)}
                />
              </div>
              
              {activeNode.id !== 'fallback' && activeEdge && (
                <div className="form-group">
                  <label>Trigger Keywords (comma separated)</label>
                  <input 
                    type="text" 
                    value={activeEdge.relation.replace("matches:", "")}
                    onChange={(e) => handleUpdateNode(activeNode.response, activeNode.label, e.target.value)}
                  />
                  <span className="form-tip">
                    If user's message contains any of these words, this node triggers.
                  </span>
                </div>
              )}
              
              <div className="form-group">
                <label>Bot Response Text</label>
                <textarea 
                  value={activeNode.response}
                  onChange={(e) => handleUpdateNode(e.target.value, activeNode.label, activeEdge ? activeEdge.relation.replace("matches:", "") : undefined)}
                />
                <span className="form-tip">
                  Use vertical bar <strong style={{ color: 'var(--accent-cyan)' }}>|</strong> to separate multiple responses for randomized variety (e.g. *Hi! | Hello buddy!*).
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: 'auto' }}>
                <button 
                  className="btn btn-cyan" 
                  onClick={() => setShowGraphManager(false)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Check size={16} /> Apply & Exit
                </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default App;
