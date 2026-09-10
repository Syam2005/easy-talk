import { useEffect, useRef, useState } from "react";
import { Mic, X, Volume2, MicOff } from "lucide-react";

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "te-IN", label: "Telugu" },
  { code: "ta-IN", label: "Tamil" },
  { code: "kn-IN", label: "Kannada" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "ar-SA", label: "Arabic" },
  { code: "zh-CN", label: "Chinese" },
];

// Uses the browser's built-in Web Speech API for both directions:
// - SpeechRecognition (speech-to-text) — free, works in Chrome/Edge
// - speechSynthesis (text-to-speech) — free, works in virtually all modern browsers
// No cloud speech API, no per-minute cost, nothing leaves your machine except the
// text itself, which goes to your own backend -> your own local Ollama model.
export default function VoiceAssistant({ socket, botUser, onClose }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [voices, setVoices] = useState([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() || []);
    loadVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(text);
      if (event.results[event.results.length - 1].isFinal) {
        askAssistant(text);
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    if (!socket || !botUser) return;
    const handler = (message) => {
      const senderId = message.sender?._id || message.sender;
      if (senderId === botUser._id) {
        setThinking(false);
        setReply(message.text);
        speak(message.text);
      }
    };
    socket.on("receiveMessage", handler);
    return () => socket.off("receiveMessage", handler);
  }, [socket, botUser]);

  const speak = (text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.lang = language;

    const matchingVoice = voices.find((v) => v.lang === language) ||
      voices.find((v) => v.lang.startsWith(language.split("-")[0]));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const askAssistant = (text) => {
    if (!text.trim() || !socket || !botUser) return;
    setReply("");
    setThinking(true);
    const languageLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";
    socket.emit("sendMessage", {
      receiver: botUser._id,
      text: text.trim(),
      replyLanguage: languageLabel,
    });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript("");
      setReply("");
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-midnight-950/95 z-50 flex flex-col items-center justify-center p-6">
      <button onClick={onClose} className="absolute top-6 right-6 text-mist/50 hover:text-white">
        <X size={22} />
      </button>

      <select
        value={language}
        onChange={(e) => {
          setLanguage(e.target.value);
          setTranscript("");
          setReply("");
        }}
        className="absolute top-6 left-6 rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-signal-500/60"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>

      <button
        onClick={supported ? toggleListening : undefined}
        disabled={!supported}
        className={`h-28 w-28 rounded-full flex items-center justify-center mb-6 transition-all ${
          listening
            ? "bg-signal-500/30 scale-110"
            : speaking
            ? "bg-amber-500/25"
            : "bg-midnight-800 hover:bg-midnight-700"
        }`}
      >
        {supported ? (
          <Mic size={36} className={listening ? "text-signal-400" : "text-mist/60"} />
        ) : (
          <MicOff size={32} className="text-mist/40" />
        )}
      </button>

      <p className="font-display text-lg text-white mb-1">Easy Talk Voice Assistant</p>
      <p className="text-xs text-mist/40 mb-6">
        Speech recognition & voice output run free in your browser — no cloud speech API used.
      </p>

      {!supported && (
        <p className="text-sm text-red-400 max-w-sm text-center mb-4">
          Voice input isn't supported in this browser. Try Chrome or Edge for free built-in speech
          recognition — you can still type to the assistant from the regular chat.
        </p>
      )}

      {transcript && (
        <p className="text-sm text-mist/70 max-w-md text-center mb-3">&ldquo;{transcript}&rdquo;</p>
      )}

      {thinking && <p className="text-xs text-signal-400 mb-3 animate-pulse">Thinking...</p>}

      {reply && (
        <div className="flex items-start gap-2 max-w-md bg-midnight-800 rounded-xl px-4 py-3 mb-4">
          <Volume2 size={15} className={`shrink-0 mt-0.5 ${speaking ? "text-amber-400" : "text-mist/40"}`} />
          <p className="text-sm text-white text-left">{reply}</p>
        </div>
      )}

      {supported && (
        <button
          onClick={toggleListening}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
            listening ? "bg-red-500 hover:bg-red-400 text-white" : "bg-signal-500 hover:bg-signal-400 text-white"
          }`}
        >
          {listening ? "Stop listening" : "Tap to speak"}
        </button>
      )}
    </div>
  );
}
