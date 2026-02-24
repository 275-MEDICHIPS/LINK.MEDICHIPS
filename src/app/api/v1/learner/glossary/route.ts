import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { GlossaryService } from "@/lib/services/glossary.service";

const glossaryService = new GlossaryService();

export async function GET(req: NextRequest) {
  try {
    authenticate(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const result = await glossaryService.searchTerms({
      query: search,
      locale: "en",
    });

    const terms = result.terms.map((term) => ({
      id: term.id,
      term: term.term,
      locale: term.locale,
      definition: term.definition,
      abbreviation: term.abbreviation,
      isVerified: term.isVerified,
      specialty: null,
      translations: [],
    }));

    return success({
      terms,
      total: result.total,
    });
  } catch (error) {
    return handleError(error);
  }
}
