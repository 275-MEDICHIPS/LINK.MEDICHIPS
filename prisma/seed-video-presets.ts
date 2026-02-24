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

  // ─── Voice Presets ───────────────────────────────────────────────────────
  const voicePresetData = [
    { name: "Kim Professor (Female)", ttsVoiceName: "ko-KR-Neural2-A", languageCode: "ko-KR", gender: "FEMALE", voiceType: "Neural2" },
    { name: "Park Doctor (Male)", ttsVoiceName: "ko-KR-Neural2-C", languageCode: "ko-KR", gender: "MALE", voiceType: "Neural2" },
    { name: "Sarah (Female)", ttsVoiceName: "en-US-Neural2-C", languageCode: "en-US", gender: "FEMALE", voiceType: "Neural2" },
    { name: "James (Male)", ttsVoiceName: "en-US-Neural2-D", languageCode: "en-US", gender: "MALE", voiceType: "Neural2" },
    { name: "Dr. Miller (Female, Studio)", ttsVoiceName: "en-US-Studio-O", languageCode: "en-US", gender: "FEMALE", voiceType: "Studio" },
    { name: "Dr. Anderson (Male, Studio)", ttsVoiceName: "en-US-Studio-Q", languageCode: "en-US", gender: "MALE", voiceType: "Studio" },
    { name: "Marie (Female)", ttsVoiceName: "fr-FR-Neural2-A", languageCode: "fr-FR", gender: "FEMALE", voiceType: "Neural2" },
    { name: "Carmen (Female)", ttsVoiceName: "es-ES-Neural2-A", languageCode: "es-ES", gender: "FEMALE", voiceType: "Neural2" },
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
  console.log(`Voice presets: ${voicePresetData.length} upserted`);

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
