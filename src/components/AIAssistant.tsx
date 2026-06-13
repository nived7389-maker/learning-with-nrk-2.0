import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Menu, Plus, Send, Image as ImageIcon, MessageSquare, Trash2, Home, Camera, Search, Globe } from "lucide-react";
import { Student } from "../types";
import { fetchAIChatHistory, saveAIChatHistory } from "../firebase";
import { BotLogo } from "./BotLogo";

interface Message {
  role: "user" | "model";
  text: string;
  image?: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface AIAssistantProps {
  student: Student;
  onBackToHome: () => void;
}

export default function AIAssistant({ student, onBackToHome }: AIAssistantProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history from Firebase
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await fetchAIChatHistory(student.uid);
        if (history && history.length > 0) {
          setChatHistories(history);
        }
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    };
    loadHistory();
  }, [student.uid]);

  // Save history to Firebase
  const saveHistory = (newHistories: ChatHistory[]) => {
    setChatHistories(newHistories);
    saveAIChatHistory(student.uid, newHistories).catch(e => console.error("Failed to save history", e));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setIsDrawerOpen(false);
    setAttachedImage(null);
    setInputValue("");
  };

  const handleSelectChat = (id: string) => {
    const chat = chatHistories.find(c => c.id === id);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
      setIsDrawerOpen(false);
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistories = chatHistories.filter(c => c.id !== id);
    saveHistory(newHistories);
    if (currentChatId === id) {
      handleNewChat();
    }
  };

  const startCamera = async () => {
    try {
      setShowAttachMenu(false);
      setIsLiveCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to access camera", err);
      alert("Microphone/Camera access required. Please allow permissions in your browser.");
      setIsLiveCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        let width = canvas.width;
        let height = canvas.height;
        const MAX_SIZE = 800; // further compression limits
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outCtx = outputCanvas.getContext('2d');
        if (outCtx) {
          outCtx.drawImage(canvas, 0, 0, width, height);
          const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.6); // Lower quality to avoid 413
          const [mimePrefix, base64] = dataUrl.split(",");
          setAttachedImage({ url: dataUrl, base64, mimeType: "image/jpeg" });
        }
      }
      stopCamera();
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        
        // Compress image using Canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          // Max dimensions for Gemini API limits
          const MAX_SIZE = 800; // further compression
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6); // Lower quality out of bounds
            const [mimePrefix, base64] = compressedDataUrl.split(",");
            const mimeType = "image/jpeg";
            setAttachedImage({ url: compressedDataUrl, base64, mimeType });
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateChatHistory = (newMessages: Message[]) => {
    let chatId = currentChatId;
    let newHistories = [...chatHistories];

    if (!chatId) {
      chatId = Date.now().toString();
      setCurrentChatId(chatId);
      const title = newMessages[0].text.substring(0, 30) || "Image Query";
      newHistories.unshift({ id: chatId, title, messages: newMessages, updatedAt: Date.now() });
    } else {
      const idx = newHistories.findIndex(c => c.id === chatId);
      if (idx !== -1) {
        newHistories[idx].messages = newMessages;
        newHistories[idx].updatedAt = Date.now();
        // Move to top
        const chat = newHistories.splice(idx, 1)[0];
        newHistories.unshift(chat);
      }
    }
    saveHistory(newHistories);
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && !attachedImage) || isSending) return;

    const userMessage: Message = {
      role: "user",
      text: inputValue.trim(),
      ...(attachedImage && { image: attachedImage.url }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateChatHistory(newMessages);

    const payload = {
      prompt: inputValue.trim(),
      ...(attachedImage && {
        base64Image: attachedImage.base64,
        mimeType: attachedImage.mimeType
      }),
      // Send only recent history to prevent payload too large errors
      history: messages.slice(-6).map(m => ({ role: m.role, text: m.text }))
    };

    setInputValue("");
    setAttachedImage(null);
    setIsSending(true);

    try {
      const endpoint = import.meta.env.PROD 
        ? "/.netlify/functions/chat" 
        : "/api/gemini/chat";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Netlify Error (404): Serverless Backend not found. Please connect your GitHub repository directly to Netlify. DO NOT drag-and-drop the ZIP file, as this breaks the AI backend on Netlify.");
        }
        if (response.status === 401) {
          throw new Error("API Key Missing: Please add 'OPENROUTER_API_KEY' in your Netlify Site settings > Environment Variables.");
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (response.status === 413 || text.includes("413") || text.toLowerCase().includes("too large")) {
          throw new Error("The image or message is too large to send. Please try a smaller image.");
        }
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(`Server connection issue (Status: ${response.status}). Please try again.`);
      }

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429 || (data.error && (typeof data.error === 'string' && data.error.includes("429")) || (data.error && data.error.includes("Quota exceeded")))) {
          throw new Error("API Quota Exceeded: The free tier limit for the Gemini API has been reached. Please wait a few moments and try again.");
        }
        throw new Error(data.error || "Failed to respond");
      }

      const finalMessages = [...newMessages, { role: "model", text: data.text } as Message];
      setMessages(finalMessages);
      updateChatHistory(finalMessages);
    } catch (error: any) {
      const errorMessage = error.message && error.message !== "Failed to respond" ? error.message : "Sorry, I am having trouble connecting to the servers. Please try again.";
      if (!errorMessage.includes("OPENROUTER_API_KEY") && !errorMessage.includes("API Quota")) {
        console.error("Chat Error:", error);
      }
      const finalMessages = [...newMessages, { role: "model", text: `Error: ${errorMessage}` } as Message];
      setMessages(finalMessages);
      updateChatHistory(finalMessages);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050A15] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Background Graphic resembling 22222.png wave */}
      {messages.length === 0 && (
        <div className="absolute inset-0 pointer-events-none opacity-60">
           <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="w-full h-full">
             <path d="M0,700 C200,600 300,800 500,700 C700,600 800,800 1000,700 L1000,1000 L0,1000 Z" fill="url(#waveGrad1)" opacity="0.3" />
             <path d="M0,800 C250,650 350,900 600,750 C800,600 900,900 1000,800 L1000,1000 L0,1000 Z" fill="url(#waveGrad2)" opacity="0.5" />
             <defs>
               <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#050A15" stopOpacity="0" />
               </linearGradient>
               <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                 <stop offset="100%" stopColor="#050A15" stopOpacity="0" />
               </linearGradient>
             </defs>
           </svg>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 bg-[#050A15]/80 backdrop-blur-md border-b border-white/5 shadow-xl">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <BotLogo className="w-6 h-6" />
          <h1 className="font-bold tracking-widest text-sm uppercase flex items-center gap-2">
            ASTR AI <span className="bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium">Beta</span>
          </h1>
        </div>
        <button onClick={onBackToHome} className="p-2 -mr-2 text-white/70 hover:text-white transition-colors" title="Home">
          <Home className="w-6 h-6" />
        </button>
      </header>

      {/* Live Camera Overlay */}
      <AnimatePresence>
        {isLiveCameraOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="absolute inset-0 z-50 bg-black flex flex-col"
          >
            <div className="flex-1 relative overflow-hidden">
              <video autoPlay playsInline muted ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <button 
                onClick={stopCamera} 
                className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="h-32 bg-black pb-safe flex items-center justify-center p-6">
               <button 
                 onClick={capturePhoto} 
                 className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-[#22D3EE]/20 hover:bg-[#22D3EE]/40 transition-colors"
               >
                 <div className="w-12 h-12 rounded-full bg-white"></div>
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col overflow-hidden z-10">
        <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto px-4 pb-24 pt-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center -mt-20">
               <motion.h2 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-20 drop-shadow-2xl"
               >
                 Hello, {student.name.split(' ')[0]}
               </motion.h2>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-[#22D3EE]/10 border border-[#22D3EE]/20 rounded-tr-sm' : 'bg-white/5 border border-white/10 rounded-tl-sm'}`}>
                    {msg.role === 'model' && (
                       <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                         <BotLogo className="w-4 h-4" />
                         <span className="text-xs font-bold text-[#22D3EE] uppercase tracking-wider">ASTR AI</span>
                       </div>
                    )}
                    {msg.image && (
                      <img src={msg.image} alt="Upload" className="max-w-full h-auto rounded-xl mb-3 border border-white/10" />
                    )}
                    {msg.text && (
                      <div className="text-sm md:text-base leading-relaxed text-white/90 whitespace-pre-wrap">
                        {msg.text}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                   <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 w-16 flex items-center justify-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#050A15] via-[#050A15]/95 to-transparent">
          <div className="max-w-3xl mx-auto">
            {attachedImage && (
              <div className="mb-3 relative inline-block">
                <img src={attachedImage.url} alt="Attached preview" className="h-20 w-20 object-cover rounded-xl border border-[#22D3EE]/40 shadow-lg" />
                <button 
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full border border-white/20 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            <div className="relative">
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-16 left-0 bg-[#0A1224] border border-[#22D3EE]/30 rounded-2xl p-2 flex gap-2 shadow-xl z-50"
                  >
                    <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-[#22D3EE]/10 text-white group cursor-pointer outline-none transition-colors"
                      onClick={startCamera}>
                      <div className="w-10 h-10 rounded-full bg-[#22D3EE]/10 flex items-center justify-center text-[#22D3EE] group-hover:bg-[#22D3EE] group-hover:text-slate-900 transition-colors shadow-sm">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-sans font-medium whitespace-nowrap text-slate-300 group-hover:text-white transition-colors">Live camera</span>
                    </button>
                    <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-[#22D3EE]/10 text-white group cursor-pointer outline-none transition-colors"
                      onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                      <div className="w-10 h-10 rounded-full bg-[#22D3EE]/10 flex items-center justify-center text-[#22D3EE] group-hover:bg-[#22D3EE] group-hover:text-slate-900 transition-colors shadow-sm">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-sans font-medium whitespace-nowrap text-slate-300 group-hover:text-white transition-colors">Take pictures</span>
                    </button>
                    <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-[#22D3EE]/10 text-white group cursor-pointer outline-none transition-colors"
                      onClick={() => { /* Implement search */ setShowAttachMenu(false); }}>
                      <div className="w-10 h-10 rounded-full bg-[#22D3EE]/10 flex items-center justify-center text-[#22D3EE] group-hover:bg-[#22D3EE] group-hover:text-slate-900 transition-colors shadow-sm">
                        <Search className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-sans font-medium whitespace-nowrap text-slate-300 group-hover:text-white transition-colors">Search option</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="bg-[#0A1224] border border-[#22D3EE]/30 rounded-full flex items-center gap-2 px-3 py-2 shadow-[0_0_15px_rgba(34,211,238,0.1)] relative">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} />
              
              <button 
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer outline-none ${showAttachMenu ? 'bg-[#22D3EE] text-slate-900' : 'bg-white/5 text-[#22D3EE] hover:bg-[#22D3EE]/20'}`}
                title="Attach photo"
              >
                <Plus className={`w-5 h-5 transition-transform duration-300 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </button>
              
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="Ask here" 
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-base"
              />
              
              <button 
                onClick={sendMessage}
                disabled={isSending || (!inputValue.trim() && !attachedImage)}
                className="w-10 h-10 rounded-full bg-[#22D3EE] flex flex-shrink-0 items-center justify-center text-slate-900 hover:bg-[#22D3EE]/90 disabled:opacity-50 transition-colors cursor-pointer outline-none"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-stretch"
            onClick={() => setIsDrawerOpen(false)}
          >
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="w-72 bg-[#050A15] border-r border-[#22D3EE]/20 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BotLogo className="w-6 h-6" />
                  <h2 className="font-bold tracking-widest text-[13px] uppercase flex items-center gap-2">
                    ASTR AI <span className="bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium">BETA</span>
                  </h2>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                <button 
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4">
                <h3 className="px-3 text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Chat History</h3>
                <div className="space-y-1">
                  {chatHistories.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-white/30 italic">No history yet.</div>
                  ) : (
                    chatHistories.map(chat => (
                      <div 
                        key={chat.id}
                        onClick={() => handleSelectChat(chat.id)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left cursor-pointer transition-colors group ${
                          currentChatId === chat.id ? 'bg-[#22D3EE]/10 text-[#22D3EE]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{chat.title}</span>
                        <button 
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 focus:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
