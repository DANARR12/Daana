import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Play,
  Pause,
  Volume2,
  Download,
  FileVideo,
  Languages,
  Mic,
  Save,
  Keyboard,
  FileUp,
  FileText,
  Waveform,
  Sparkles,
  AlertCircle,
  Settings,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';

export default function DubbingApp() {
  // Video state
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Subtitles
  const [subtitles, setSubtitles] = useState([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Audio tracks (overlay on video)
  const [audioTracks, setAudioTracks] = useState([]);
  const audioPlayersRef = useRef({}); // Map of trackId -> HTMLAudioElement

  // Shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ElevenLabs
  const [apiKey, setApiKey] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [elevenLabsSettings, setElevenLabsSettings] = useState({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true
  });

  // Refs
  const videoRef = useRef(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ELEVENLABS_API_KEY') || '';
    if (stored) setApiKey(stored);
  }, []);

  // Fetch voices when API key changes
  useEffect(() => {
    if (!apiKey) return;
    fetchVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const fetchVoices = async () => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      if (data?.voices?.length) {
        setVoices(data.voices);
        setSelectedVoice((prev) => prev || data.voices[0].voice_id);
      }
    } catch (err) {
      console.error('Error fetching voices', err);
      setGenerationProgress('خطا له گەڕانەوەی دەنگەکان - Error fetching voices');
    }
  };

  const generateSpeechWithElevenLabs = async (text, voiceId) => {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: elevenLabsSettings.stability,
          similarity_boost: elevenLabsSettings.similarity_boost,
          style: elevenLabsSettings.style,
          use_speaker_boost: elevenLabsSettings.use_speaker_boost
        }
      })
    });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    return await response.blob();
  };

  const generateAudioForSubtitle = async (subtitleId) => {
    const subtitle = subtitles.find((s) => s.id === subtitleId);
    if (!subtitle || !(subtitle.kurdishText || subtitle.text)) {
      alert('تکایە دەقی کوردی بنووسە - Please add Kurdish text first');
      return;
    }
    if (!apiKey || !selectedVoice) {
      alert('تکایە API Key و دەنگ هەڵبژێرە');
      return;
    }
    setIsGenerating(true);
    setGenerationProgress(`دروستکردنی دەنگ بۆ: "${(subtitle.kurdishText || subtitle.text).substring(0, 30)}..."`);
    try {
      const audioBlob = await generateSpeechWithElevenLabs(
        subtitle.kurdishText || subtitle.text,
        selectedVoice
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const newTrack = {
        id: Date.now(),
        startTime: subtitle.startTime,
        url: audioUrl,
        blob: audioBlob,
        volume: 1,
        subtitleId: subtitleId,
        generatedByAI: true
      };
      setAudioTracks((prev) => [...prev, newTrack]);
      setGenerationProgress('سەرکەوتوو! - Success!');
      setTimeout(() => setGenerationProgress(''), 1500);
    } catch (err) {
      console.error(err);
      setGenerationProgress('خطا له دروستکردنی دەنگ - Error generating audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllAudio = async () => {
    const items = subtitles.filter((s) => s.kurdishText || s.text);
    if (!items.length) {
      alert('تکایە دەقی کوردی زیاد بکە - Please add Kurdish text to subtitles');
      return;
    }
    if (!apiKey || !selectedVoice) {
      alert('تکایە API Key و دەنگ هەڵبژێرە');
      return;
    }
    setIsGenerating(true);
    const newTracks = [];
    for (let i = 0; i < items.length; i++) {
      const subtitle = items[i];
      setGenerationProgress(`دروستکردن ${i + 1}/${items.length}: ${(subtitle.kurdishText || subtitle.text).substring(0, 30)}...`);
      try {
        const audioBlob = await generateSpeechWithElevenLabs(
          subtitle.kurdishText || subtitle.text,
          selectedVoice
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        newTracks.push({
          id: Date.now() + i,
          startTime: subtitle.startTime,
          url: audioUrl,
          blob: audioBlob,
          volume: 1,
          subtitleId: subtitle.id,
          generatedByAI: true
        });
        // small delay to avoid throttling
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error('generation error', err);
      }
    }
    setAudioTracks((prev) => [...prev, ...newTracks]);
    setGenerationProgress(`تەواو بوو! ${newTracks.length} دەنگ دروستکرا`);
    setTimeout(() => setGenerationProgress(''), 2000);
    setIsGenerating(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipTime(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          skipTime(5);
          break;
        case 'n':
          e.preventDefault();
          addSubtitle();
          break;
        case 'r':
          e.preventDefault();
          if (!isRecording) startRecording();
          else stopRecording();
          break;
        case 'g':
          if (selectedSubtitleId) {
            e.preventDefault();
            generateAudioForSubtitle(selectedSubtitleId);
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            exportProject();
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRecording, selectedSubtitleId, subtitles]);

  // Video controls
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const togglePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      pauseAllAudioPlayers();
      setIsPlaying(false);
    } else {
      el.play();
      setIsPlaying(true);
      // Will be handled on time updates too
      syncAudioPlayers(el.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    syncAudioPlayers(t);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    // On seek, stop all currently playing audios so they can restart if needed
    stopAllAudioPlayers();
    if (isPlaying) syncAudioPlayers(newTime);
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
  };

  const skipTime = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    stopAllAudioPlayers();
  };

  // Audio players management
  const syncAudioPlayers = (videoTime) => {
    const players = audioPlayersRef.current;
    // Start any track whose startTime has passed and not yet playing
    audioTracks.forEach((track) => {
      if (videoTime >= track.startTime && !players[track.id]) {
        const a = new Audio(track.url);
        a.volume = track.volume ?? 1;
        a.play().catch(() => {});
        players[track.id] = a;
      }
      // If we seeked back before startTime and it was playing, reset it
      if (videoTime < track.startTime && players[track.id]) {
        try {
          players[track.id].pause();
          players[track.id].currentTime = 0;
        } catch {}
        delete players[track.id];
      }
    });
  };

  const pauseAllAudioPlayers = () => {
    const players = audioPlayersRef.current;
    Object.values(players).forEach((p) => {
      try {
        p.pause();
      } catch {}
    });
  };

  const stopAllAudioPlayers = () => {
    const players = audioPlayersRef.current;
    Object.entries(players).forEach(([id, p]) => {
      try {
        p.pause();
        p.currentTime = 0;
      } catch {}
      delete players[id];
    });
  };

  // Subtitles CRUD
  const addSubtitle = () => {
    const newSubtitle = {
      id: Date.now(),
      startTime: currentTime,
      endTime: currentTime + 3,
      text: '',
      kurdishText: ''
    };
    setSubtitles((prev) => [...prev, newSubtitle]);
    setSelectedSubtitleId(newSubtitle.id);
  };

  const updateSubtitle = (id, field, value) => {
    setSubtitles((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const deleteSubtitle = (id) => {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
    if (selectedSubtitleId === id) setSelectedSubtitleId(null);
  };

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newTrack = {
          id: Date.now(),
          startTime: currentTime,
          url: audioUrl,
          blob: audioBlob,
          volume: 1,
          generatedByAI: false
        };
        setAudioTracks((prev) => [...prev, newTrack]);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('خطا له دەسپێکردنی تۆمارکردن: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const updateAudioTrackVolume = (id, newVolume) => {
    setAudioTracks((prev) => prev.map((t) => (t.id === id ? { ...t, volume: newVolume } : t)));
    const p = audioPlayersRef.current[id];
    if (p) p.volume = newVolume;
  };

  const deleteAudioTrack = (id) => {
    const p = audioPlayersRef.current[id];
    if (p) {
      try {
        p.pause();
        p.currentTime = 0;
      } catch {}
      delete audioPlayersRef.current[id];
    }
    setAudioTracks((prev) => prev.filter((t) => t.id !== id));
  };

  // Utilities
  const formatTime = (time) => {
    if (!Number.isFinite(time)) return '0:00.00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(2, '0')}`;
  };

  const formatSRTTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
      .toString()
      .padStart(3, '0')}`;
  };

  const parseSRT = (content) => {
    const blocks = content.trim().split(/\r?\n\r?\n/);
    const subs = [];
    blocks.forEach((block) => {
      const lines = block.split(/\r?\n/);
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(
          /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
        );
        if (timeMatch) {
          const startTime =
            parseInt(timeMatch[1]) * 3600 +
            parseInt(timeMatch[2]) * 60 +
            parseInt(timeMatch[3]) +
            parseInt(timeMatch[4]) / 1000;
          const endTime =
            parseInt(timeMatch[5]) * 3600 +
            parseInt(timeMatch[6]) * 60 +
            parseInt(timeMatch[7]) +
            parseInt(timeMatch[8]) / 1000;
          const text = lines.slice(2).join('\n');
          subs.push({
            id: Date.now() + Math.random(),
            startTime,
            endTime,
            text: '',
            kurdishText: text
          });
        }
      }
    });
    return subs;
  };

  // Import/Export project
  const exportProject = () => {
    const projectData = {
      subtitles,
      audioTracks: audioTracks.map((t) => ({
        id: t.id,
        startTime: t.startTime,
        volume: t.volume,
        generatedByAI: t.generatedByAI
      })),
      videoFileName: videoFile?.name,
      elevenLabsSettings,
      selectedVoice
    };
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kurdish-dubbing-project.json';
    a.click();
  };

  const importProject = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target.result);
        if (projectData.subtitles) setSubtitles(projectData.subtitles);
        if (projectData.elevenLabsSettings) setElevenLabsSettings(projectData.elevenLabsSettings);
        if (projectData.selectedVoice) setSelectedVoice(projectData.selectedVoice);
        alert('پڕۆژە بە سەرکەوتوویی هاوردە کرا!');
      } catch (err) {
        alert('هەڵە له هاوردەکردنی پڕۆژە: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const exportSRT = () => {
    const ordered = [...subtitles].sort((a, b) => a.startTime - b.startTime);
    let srt = '';
    ordered.forEach((sub, index) => {
      const start = formatSRTTime(sub.startTime);
      const end = formatSRTTime(sub.endTime);
      srt += `${index + 1}\n`;
      srt += `${start} --> ${end}\n`;
      srt += `${sub.kurdishText || sub.text}\n\n`;
    });
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles-kurdish.srt';
    a.click();
  };

  const importSRT = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const parsed = parseSRT(content);
        setSubtitles((prev) => [...prev, ...parsed]);
        alert('ژێرنووسەکان بە سەرکەوتوویی هاوردە کران!');
      } catch (err) {
        alert('هەڵە له هاوردەکردنی SRT: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const currentSubtitle = useMemo(() => {
    return subtitles.find((s) => currentTime >= s.startTime && currentTime <= s.endTime);
  }, [currentTime, subtitles]);

  const selectedSubtitle = useMemo(
    () => subtitles.find((s) => s.id === selectedSubtitleId) || null,
    [selectedSubtitleId, subtitles]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <FileVideo className="w-12 h-12" />
            <Sparkles className="w-8 h-8 text-yellow-400" />
            بەرنامەی AI دەنگنووسینی کوردی
          </h1>
          <p className="text-purple-200 text-lg">Kurdish AI Dubbing with ElevenLabs</p>
        </header>

        {/* ElevenLabs Settings */}
        <div className="mb-6 bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-green-400/30">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            ڕێکخستنەکانی ElevenLabs AI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-white text-sm mb-2 block">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter ElevenLabs API Key"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50"
                />
                <button
                  className="px-3 py-2 bg-green-500/80 hover:bg-green-500 text-white rounded-lg flex items-center gap-2"
                  onClick={() => {
                    localStorage.setItem('ELEVENLABS_API_KEY', apiKey);
                    fetchVoices();
                  }}
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
              <p className="text-yellow-200/80 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                ئاماژە: مەزەندە ڕازانیەکەت لە هەموو کۆددا مەهەڵگرە. دواکە کاریگەرییەکی تایبەتی بەکاربێنە.
              </p>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">دەنگی AI (AI Voice)</label>
              <div className="flex gap-2">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id} className="bg-slate-900">
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchVoices}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2"
                  title="Refresh voices"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white text-xs">Stability: {elevenLabsSettings.stability.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={elevenLabsSettings.stability}
                  onChange={(e) =>
                    setElevenLabsSettings((s) => ({ ...s, stability: parseFloat(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-xs">Similarity: {elevenLabsSettings.similarity_boost.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={elevenLabsSettings.similarity_boost}
                  onChange={(e) =>
                    setElevenLabsSettings((s) => ({ ...s, similarity_boost: parseFloat(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-xs">Style: {elevenLabsSettings.style.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={elevenLabsSettings.style}
                  onChange={(e) =>
                    setElevenLabsSettings((s) => ({ ...s, style: parseFloat(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input
                  id="speakerBoost"
                  type="checkbox"
                  checked={elevenLabsSettings.use_speaker_boost}
                  onChange={(e) =>
                    setElevenLabsSettings((s) => ({ ...s, use_speaker_boost: e.target.checked }))
                  }
                />
                <label htmlFor="speakerBoost" className="text-white text-xs">
                  Use speaker boost
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              disabled={isGenerating}
              onClick={generateAllAudio}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Generate all Kurdish audio
            </button>
            {generationProgress && (
              <span className="text-white/90 animate-pulse">{generationProgress}</span>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/90">
                <FileVideo className="w-5 h-5" />
                <span>وێنە (Video)</span>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload video</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              </label>
            </div>

            <div className="aspect-video bg-black/60 rounded-lg overflow-hidden mb-3">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60">
                  <span className="flex items-center gap-2"><FileVideo className="w-5 h-5" /> No video selected</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => skipTime(-5)}
                  className="px-3 py-2 bg-white/10 rounded-lg text-white"
                  title="-5s"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => skipTime(5)}
                  className="px-3 py-2 bg-white/10 rounded-lg text-white"
                  title="+5s"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="flex-1 flex items-center gap-3">
                  <span className="text-white/80 text-sm w-20 text-right">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1"
                  />
                  <span className="text-white/80 text-sm w-20">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-white/70" />
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} />
                </div>

                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-xs">Speed</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                    <button
                      key={r}
                      className={`px-2 py-1 rounded border ${playbackRate === r ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/20'}`}
                      onClick={() => handlePlaybackRateChange(r)}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Active subtitle display */}
              <div className="h-12 bg-white/5 rounded-lg flex items-center justify-center text-white text-lg">
                {currentSubtitle ? (currentSubtitle.kurdishText || currentSubtitle.text) : 'No subtitle at current time'}
              </div>
            </div>
          </div>

          {/* Right: Subtitles and Tools */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/90">
                <Languages className="w-5 h-5" />
                <span>ژێرنووسەکان (Subtitles)</span>
              </div>
              <button onClick={addSubtitle} className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /> New (N)
              </button>
            </div>

            {/* Subtitle list */}
            <div className="max-h-64 overflow-auto space-y-2">
              {[...subtitles]
                .sort((a, b) => a.startTime - b.startTime)
                .map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSubtitleId(s.id)}
                    className={`p-2 rounded-lg cursor-pointer border ${selectedSubtitleId === s.id ? 'bg-purple-600/30 border-purple-400/50' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className="flex items-center justify-between text-white/90 text-sm">
                      <span>
                        {formatTime(s.startTime)} - {formatTime(s.endTime)}
                      </span>
                      <button
                        className="text-red-300 hover:text-red-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSubtitle(s.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-white/80 text-xs truncate">{s.kurdishText || s.text || '—'}</div>
                  </div>
                ))}
            </div>

            {/* Subtitle editor */}
            {selectedSubtitle && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/80 text-xs">Start</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedSubtitle.startTime}
                      onChange={(e) => updateSubtitle(selectedSubtitle.id, 'startTime', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white/80 text-xs">End</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedSubtitle.endTime}
                      onChange={(e) => updateSubtitle(selectedSubtitle.id, 'endTime', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/80 text-xs">Original text</label>
                  <textarea
                    rows={2}
                    value={selectedSubtitle.text}
                    onChange={(e) => updateSubtitle(selectedSubtitle.id, 'text', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/80 text-xs">Kurdish text</label>
                  <textarea
                    dir="rtl"
                    rows={2}
                    value={selectedSubtitle.kurdishText}
                    onChange={(e) => updateSubtitle(selectedSubtitle.id, 'kurdishText', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={!selectedSubtitleId || isGenerating}
                    onClick={() => generateAudioForSubtitle(selectedSubtitleId)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Generate for this (G)
                  </button>
                  <button
                    onClick={() => {
                      if (!isRecording) startRecording();
                      else stopRecording();
                    }}
                    className={`px-3 py-2 rounded-lg text-white flex items-center gap-2 ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                  >
                    <Mic className="w-4 h-4" /> {isRecording ? 'Stop' : 'Record'} (R)
                  </button>
                </div>
              </div>
            )}

            {/* Audio tracks */}
            <div>
              <div className="flex items-center gap-2 text-white/90 mb-2">
                <Waveform className="w-5 h-5" />
                <span>دەنگەکان (Audio tracks)</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-auto">
                {audioTracks.map((t) => (
                  <div key={t.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between text-white/90 text-sm">
                      <div className="flex items-center gap-2">
                        {t.generatedByAI ? (
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                        ) : (
                          <Mic className="w-4 h-4 text-green-300" />
                        )}
                        <span>{formatTime(t.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.blob && (
                          <a
                            href={URL.createObjectURL(t.blob)}
                            download={`track-${t.id}.mp3`}
                            className="text-white/90 hover:text-white"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button className="text-red-300 hover:text-red-200" onClick={() => deleteAudioTrack(t.id)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-white/80 text-xs">
                      <span>Vol</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={t.volume}
                        onChange={(e) => updateAudioTrackVolume(t.id, parseFloat(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
                {!audioTracks.length && (
                  <div className="text-white/60 text-sm">No audio tracks yet</div>
                )}
              </div>
            </div>

            {/* Import/Export */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
              <button
                onClick={exportProject}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Export project (Ctrl/Cmd+S)
              </button>

              <label className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2 cursor-pointer">
                <FileUp className="w-4 h-4" /> Import project
                <input type="file" accept="application/json" className="hidden" onChange={importProject} />
              </label>

              <button
                onClick={exportSRT}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Export SRT
              </button>

              <label className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2 cursor-pointer">
                <FileUp className="w-4 h-4" /> Import SRT
                <input type="file" accept=".srt,text/plain" className="hidden" onChange={importSRT} />
              </label>

              <button
                onClick={() => setShowShortcuts(true)}
                className="ml-auto px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2"
              >
                <Keyboard className="w-4 h-4" /> Shortcuts
              </button>
            </div>
          </div>
        </div>

        {/* Shortcuts modal */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
                <Keyboard className="w-5 h-5" /> Keyboard Shortcuts
              </div>
              <ul className="space-y-2 text-white/90 text-sm">
                <li><b>Space</b> — Play/Pause</li>
                <li><b>←/→</b> — Seek -5s/+5s</li>
                <li><b>N</b> — New subtitle</li>
                <li><b>R</b> — Start/Stop recording</li>
                <li><b>G</b> — Generate audio for selected</li>
                <li><b>Ctrl/Cmd + S</b> — Export project</li>
                <li><b>?</b> — Toggle this help</li>
              </ul>
              <div className="mt-4 text-right">
                <button onClick={() => setShowShortcuts(false)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
