/**
 * Standalone seed for Voice Presets and Prompt Templates.
 * Safe to run multiple times (uses upsert / delete+recreate).
 *
 * Usage: npx tsx prisma/seed-video-presets.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Voice Presets & Prompt Templates...\n");

  // ─── Delete old Neural2/Studio presets ──────────────────────────────────
  const deleted = await prisma.voicePreset.deleteMany({
    where: {
      voiceType: { in: ["Neural2", "Studio"] },
    },
  });
  if (deleted.count > 0) {
    console.log(`Deleted ${deleted.count} old Neural2/Studio presets`);
  }

  // ─── Voice Presets (Chirp3-HD — latest, highest quality) ────────────────
  const voicePresetData = [
    // Korean
    { name: "김 교수 (여성)", ttsVoiceName: "ko-KR-Chirp3-HD-Leda", languageCode: "ko-KR", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "이 교수 (여성, 차분)", ttsVoiceName: "ko-KR-Chirp3-HD-Aoede", languageCode: "ko-KR", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "박 의사 (남성)", ttsVoiceName: "ko-KR-Chirp3-HD-Achird", languageCode: "ko-KR", gender: "MALE", voiceType: "Chirp3-HD" },
    { name: "정 의사 (남성, 차분)", ttsVoiceName: "ko-KR-Chirp3-HD-Puck", languageCode: "ko-KR", gender: "MALE", voiceType: "Chirp3-HD" },
    { name: "최 간호사 (여성)", ttsVoiceName: "ko-KR-Chirp3-HD-Achernar", languageCode: "ko-KR", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "한 원장 (남성)", ttsVoiceName: "ko-KR-Chirp3-HD-Fenrir", languageCode: "ko-KR", gender: "MALE", voiceType: "Chirp3-HD" },
    // English
    { name: "Dr. Sarah (Female)", ttsVoiceName: "en-US-Chirp3-HD-Leda", languageCode: "en-US", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "Dr. Emily (Female, Calm)", ttsVoiceName: "en-US-Chirp3-HD-Zephyr", languageCode: "en-US", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "Dr. James (Male)", ttsVoiceName: "en-US-Chirp3-HD-Achird", languageCode: "en-US", gender: "MALE", voiceType: "Chirp3-HD" },
    { name: "Dr. Michael (Male, Deep)", ttsVoiceName: "en-US-Chirp3-HD-Charon", languageCode: "en-US", gender: "MALE", voiceType: "Chirp3-HD" },
    { name: "Nurse Amy (Female)", ttsVoiceName: "en-US-Chirp3-HD-Aoede", languageCode: "en-US", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "Prof. Anderson (Male)", ttsVoiceName: "en-US-Chirp3-HD-Fenrir", languageCode: "en-US", gender: "MALE", voiceType: "Chirp3-HD" },
    // French
    { name: "Dr. Marie (Femme)", ttsVoiceName: "fr-FR-Chirp3-HD-Leda", languageCode: "fr-FR", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "Dr. Pierre (Homme)", ttsVoiceName: "fr-FR-Chirp3-HD-Achird", languageCode: "fr-FR", gender: "MALE", voiceType: "Chirp3-HD" },
    // Spanish
    { name: "Dra. Carmen (Mujer)", ttsVoiceName: "es-ES-Chirp3-HD-Leda", languageCode: "es-ES", gender: "FEMALE", voiceType: "Chirp3-HD" },
    { name: "Dr. Carlos (Hombre)", ttsVoiceName: "es-ES-Chirp3-HD-Achird", languageCode: "es-ES", gender: "MALE", voiceType: "Chirp3-HD" },
  ];

  for (const vp of voicePresetData) {
    await prisma.voicePreset.upsert({
      where: {
        ttsVoiceName_languageCode: {
          ttsVoiceName: vp.ttsVoiceName,
          languageCode: vp.languageCode,
        },
      },
      update: { name: vp.name, gender: vp.gender, voiceType: vp.voiceType },
      create: vp,
    });
  }
  console.log(`Voice presets: ${voicePresetData.length} upserted (Chirp3-HD)`);

  // ─── Prompt Templates ──────────────────────────────────────────────────
  const templateData = [
    {
      name: "Hand Hygiene Training",
      category: "infection_control",
      description: "WHO 5 moments of hand hygiene",
      promptTemplate:
        "Proper hand hygiene technique following WHO guidelines for healthcare workers in resource-limited settings",
      defaultConfig: { riskLevel: "L1", duration: 180 },
      locale: "en",
    },
    {
      name: "Patient Assessment",
      category: "clinical_skills",
      description: "Systematic patient assessment approach",
      promptTemplate:
        "Systematic approach to patient assessment including vital signs, history taking, and physical examination for primary healthcare workers",
      defaultConfig: { riskLevel: "L2", duration: 300 },
      locale: "en",
    },
    {
      name: "Emergency Triage",
      category: "emergency",
      description: "Emergency triage protocols",
      promptTemplate:
        "Emergency triage system for rural clinics, covering START triage method and critical decision-making in mass casualty scenarios",
      defaultConfig: { riskLevel: "L3", duration: 240 },
      locale: "en",
    },
    {
      name: "Medication Administration",
      category: "medication",
      description: "Safe medication administration practices",
      promptTemplate:
        "Safe medication administration including the 5 rights of medication, common drug interactions, and adverse reaction recognition",
      defaultConfig: { riskLevel: "L2", duration: 240 },
      locale: "en",
    },
    {
      name: "Wound Care Basics",
      category: "clinical_skills",
      description: "Basic wound care and dressing",
      promptTemplate:
        "Basic wound care and dressing techniques including wound assessment, cleaning, and appropriate dressing selection for different wound types",
      defaultConfig: { riskLevel: "L1", duration: 180 },
      locale: "en",
    },
    {
      name: "PPE Donning and Doffing",
      category: "infection_control",
      description: "Personal Protective Equipment procedures",
      promptTemplate:
        "Step-by-step guide for donning and doffing Personal Protective Equipment (PPE) for infection prevention in healthcare settings",
      defaultConfig: { riskLevel: "L2", duration: 180 },
      locale: "en",
    },
  ];

  // Delete existing global templates with same names, then recreate
  await prisma.promptTemplate.deleteMany({
    where: {
      isGlobal: true,
      name: { in: templateData.map((t) => t.name) },
    },
  });

  for (const t of templateData) {
    await prisma.promptTemplate.create({
      data: { ...t, isGlobal: true },
    });
  }
  console.log(`Prompt templates: ${templateData.length} created`);

  console.log("\nDone!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
