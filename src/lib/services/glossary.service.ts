import { prisma } from "@/lib/db/prisma";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

export class GlossaryService {
  /**
   * Search glossary terms.
   */
  async searchTerms(params: {
    query?: string;
    locale?: string;
    verifiedOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (params.query) {
      where.OR = [
        { term: { contains: params.query, mode: "insensitive" } },
        { definition: { contains: params.query, mode: "insensitive" } },
        { abbreviation: { contains: params.query, mode: "insensitive" } },
      ];
    }

    if (params.locale) where.locale = params.locale;
    if (params.verifiedOnly) where.isVerified = true;

    const page = params.page || 1;
    const limit = params.limit || 50;

    const [terms, total] = await Promise.all([
      prisma.medicalGlossary.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { term: "asc" },
      }),
      prisma.medicalGlossary.count({ where }),
    ]);

    return { terms, total, page, limit };
  }

  /**
   * Get terms grouped by first letter for alphabet navigation.
   */
  async getTermsByLetter(locale = "en") {
    const cacheKey = `glossary:by-letter:${locale}`;
    const cached = await cacheGet<Record<string, unknown[]>>(cacheKey);
    if (cached) return cached;

    const terms = await prisma.medicalGlossary.findMany({
      where: { locale },
      orderBy: { term: "asc" },
      select: { id: true, term: true, abbreviation: true, definition: true },
    });

    const grouped: Record<string, unknown[]> = {};
    for (const term of terms) {
      const letter = term.term[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(term);
    }

    await cacheSet(cacheKey, grouped, 3600); // 1 hour cache
    return grouped;
  }

  /**
   * Add a new glossary term.
   */
  async addTerm(params: {
    term: string;
    definition: string;
    abbreviation?: string;
    locale: string;
    isAiGenerated?: boolean;
  }) {
    return prisma.medicalGlossary.create({
      data: {
        term: params.term,
        definition: params.definition,
        abbreviation: params.abbreviation,
        locale: params.locale,
        isVerified: !params.isAiGenerated, // AI terms need verification
      },
    });
  }

  /**
   * Verify a glossary term (mark as expert-reviewed).
   */
  async verifyTerm(termId: string, verifiedById: string) {
    return prisma.medicalGlossary.update({
      where: { id: termId },
      data: { isVerified: true, verifiedBy: verifiedById },
    });
  }
}
