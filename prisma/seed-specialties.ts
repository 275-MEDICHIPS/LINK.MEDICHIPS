/**
 * MedicalSpecialty seed + course tagging
 *
 * Usage: DATABASE_URL="..." npx tsx prisma/seed-specialties.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPECIALTIES = [
  { name: "내과", description: "Internal Medicine", iconUrl: null },
  { name: "외과", description: "Surgery", iconUrl: null },
  { name: "응급의학", description: "Emergency Medicine", iconUrl: null },
  { name: "간호", description: "Nursing", iconUrl: null },
  { name: "치위생", description: "Dental Hygiene", iconUrl: null },
  { name: "물리치료", description: "Physical Therapy", iconUrl: null },
  { name: "임상병리", description: "Clinical Pathology", iconUrl: null },
  { name: "방사선", description: "Radiology", iconUrl: null },
  { name: "약학", description: "Pharmacy", iconUrl: null },
  { name: "한의학", description: "Traditional Korean Medicine", iconUrl: null },
  { name: "정형외과", description: "Orthopedics", iconUrl: null },
  { name: "소아과", description: "Pediatrics", iconUrl: null },
  { name: "산부인과", description: "Obstetrics & Gynecology", iconUrl: null },
  { name: "피부과", description: "Dermatology", iconUrl: null },
  { name: "안과", description: "Ophthalmology", iconUrl: null },
  { name: "이비인후과", description: "Otolaryngology", iconUrl: null },
  { name: "마취통증의학", description: "Anesthesiology & Pain Medicine", iconUrl: null },
];

// Courses that belong to "내과" specialty
const INTERNAL_MEDICINE_SLUGS = [
  "colonoscopy-master",
  "gastroscopy-master",
  "abdominal-ultrasound-master",
  "thyroid-ultrasound-master",
  "cardiac-vascular-ultrasound",
  "nerve-block-master",
  "joint-injection-biopsy",
];

async function main() {
  console.log("Seeding medical specialties...");

  // Upsert specialties
  for (const spec of SPECIALTIES) {
    await prisma.medicalSpecialty.upsert({
      where: { name: spec.name },
      update: { description: spec.description },
      create: spec,
    });
  }

  console.log(`  Created/updated ${SPECIALTIES.length} specialties`);

  // Tag existing courses with "내과"
  const internalMed = await prisma.medicalSpecialty.findUnique({
    where: { name: "내과" },
  });

  if (!internalMed) {
    console.log("  Warning: 내과 specialty not found, skipping course tagging");
    return;
  }

  let tagged = 0;
  for (const slug of INTERNAL_MEDICINE_SLUGS) {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) continue;

    await prisma.courseSpecialtyTag.upsert({
      where: {
        courseId_specialtyId: {
          courseId: course.id,
          specialtyId: internalMed.id,
        },
      },
      update: {},
      create: {
        courseId: course.id,
        specialtyId: internalMed.id,
      },
    });
    tagged++;
  }

  console.log(`  Tagged ${tagged} courses with "내과"`);
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
