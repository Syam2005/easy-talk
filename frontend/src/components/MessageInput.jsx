import { useRef, useState } from "react";
import { Send, Clock, Paperclip, Mic, Square } from "lucide-react";
import { api } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function MessageInput({ onSend, onTyping, onStopTyping, onOpenSchedule }) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typingTimeout = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onStopTyping?.(), 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend({ text: text.trim() });
    setText("");
    onStopTyping?.();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        await uploadAndSendVoice(blob, transcriptRef.current.trim());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);

      // Best-effort live transcript via the browser's built-in speech
      // recognition (Chrome/Edge support it well; Safari/Firefox mostly
      // don't). If it's unavailable, we just send the voice message with no
      // transcript — the recording itself still works fine either way.
      transcriptRef.current = "";
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          let finalText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
          }
          if (finalText) transcriptRef.current += finalText + " ";
        };
        recognition.onerror = () => {}; // silently fall back to no transcript
        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          recognitionRef.current = null;
        }
      }
    } catch (err) {
      showToast("Couldn't access your microphone. Check browser permissions.", "error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  };

  const uploadAndSendVoice = async (blob, transcript = "") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, `voice-${Date.now()}.webm`);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSend({ text: transcript, mediaUrl: res.data.url, mediaType: "audio" });
    } catch (err) {
      showToast("Failed to send voice message.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast("That file is over the 25MB limit.", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const mediaType = file.type.startsWith("image/") ? "image" : "file";
      onSend({ text: "", mediaUrl: res.data.url, mediaType, fileName: file.name });
    } catch (err) {
      showToast("Failed to upload file.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4 border-t border-midnight-700 bg-midnight-900"
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFilePicked}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.zip,.txt"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || recording}
        title="Attach an image or file"
        className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-mist/50 hover:text-white hover:bg-midnight-800 transition-colors disabled:opacity-50"
      >
        <Paperclip size={18} />
      </button>

      <button
        type="button"
        onClick={onOpenSchedule}
        title="Schedule this for later"
        className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-amber-400 hover:bg-amber-500/10 transition-colors"
      >
        <Clock size={18} />
      </button>

      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
        title={recording ? "Stop recording" : "Record a voice message"}
        className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
          recording
            ? "bg-red-500/20 text-red-400 animate-pulse"
            : "text-mist/50 hover:text-white hover:bg-midnight-800"
        }`}
      >
        {recording ? <Square size={16} /> : <Mic size={18} />}
      </button>

      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder={recording ? "Recording voice message..." : uploading ? "Sending attachment..." : "Type a message..."}
        rows={1}
        disabled={recording || uploading}
        className="flex-1 resize-none rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60 max-h-32 disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={!text.trim() || recording || uploading}
        className="h-10 w-10 shrink-0 rounded-lg bg-signal-500 hover:bg-signal-400 disabled:opacity-40 disabled:hover:bg-signal-500 transition-colors flex items-center justify-center"
      >
        <Send size={16} className="text-white" />
      </button>
    </form>
  );
}
