/**
 * Google Cloud Text-to-Speech service.
 *
 * Uses the REST API for TTS synthesis.
 * Voices are cached in memory for 24 hours.
 */

import { getAccessToken } from "@/lib/gcp/auth";
import { uploadBuffer } from "@/lib/storage/gcs";

const TTS_API_BASE = "https://texttospeech.googleapis.com/v1";

// ─── Types ──────────────────────────────────────────────────────────

export interface TtsVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: "MALE" | "FEMALE" | "NEUTRAL";
  naturalSampleRateHertz: number;
}

export interface SynthesizeParams {
  text: string;
  voiceName: string;
  languageCode: string;
  speakingRate?: number;
  pitch?: number;
  audioEncoding?: "MP3" | "LINEAR16" | "OGG_OPUS";
}

// ─── Voice list cache (24h) ─────────────────────────────────────────

let voiceCache: { voices: TtsVoice[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * List available TTS voices, optionally filtered by language.
 */
export async function listVoices(languageCode?: string): Promise<TtsVoice[]> {
  if (voiceCache && Date.now() - voiceCache.fetchedAt < CACHE_TTL_MS) {
    return filterVoices(voiceCache.voices, languageCode);
  }

  const token = await getAccessToken();
  const url = `${TTS_API_BASE}/voices`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`TTS listVoices failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const voices: TtsVoice[] = data.voices || [];
  voiceCache = { voices, fetchedAt: Date.now() };

  return filterVoices(voices, languageCode);
}

function filterVoices(voices: TtsVoice[], languageCode?: string): TtsVoice[] {
  if (!languageCode) return voices;
  return voices.filter((v) =>
    v.languageCodes.some((lc) => lc.startsWith(languageCode))
  );
}

/**
 * Synthesize text to audio, returns raw audio buffer.
 */
export async function synthesizeSpeech(
  params: SynthesizeParams
): Promise<Buffer> {
  const token = await getAccessToken();

  const body = {
    input: { text: params.text },
    voice: {
      languageCode: params.languageCode,
      name: params.voiceName,
    },
    audioConfig: {
      audioEncoding: params.audioEncoding || "MP3",
      speakingRate: params.speakingRate ?? 1.0,
      pitch: params.pitch ?? 0.0,
    },
  };

  const res = await fetch(`${TTS_API_BASE}/text:synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(
      `TTS synthesize failed (${res.status}): ${await res.text()}`
    );
  }

  const data = await res.json();
  // audioContent is base64 encoded
  return Buffer.from(data.audioContent, "base64");
}

/**
 * Synthesize text and upload to GCS.
 */
export async function synthesizeAndUpload(
  params: SynthesizeParams,
  jobId: string
): Promise<{ gcsPath: string; publicUrl: string }> {
  const audioBuffer = await synthesizeSpeech(params);
  const gcsPath = `tts-audio/${jobId}/${Date.now()}.mp3`;
  const publicUrl = await uploadBuffer("media", gcsPath, audioBuffer, "audio/mpeg");

  return { gcsPath, publicUrl };
}

/**
 * Generate a short voice preview (base64 audio).
 * Uses a sample sentence based on the language.
 */
export async function generateVoicePreview(
  voiceName: string,
  languageCode: string
): Promise<string> {
  const sampleTexts: Record<string, string> = {
    "ko": "안녕하세요. 의료 교육 영상을 시작하겠습니다.",
    "en": "Hello. Let's begin the medical education session.",
    "fr": "Bonjour. Commençons la session de formation médicale.",
    "es": "Hola. Comencemos la sesión de educación médica.",
    "sw": "Habari. Tuanze kipindi cha elimu ya matibabu.",
    "am": "ሰላም። የሕክምና ትምህርት ክፍለ ጊዜውን እንጀምር።",
  };

  const langPrefix = languageCode.split("-")[0];
  const text = sampleTexts[langPrefix] || sampleTexts["en"];

  const audioBuffer = await synthesizeSpeech({
    text,
    voiceName,
    languageCode,
  });

  return audioBuffer.toString("base64");
}
