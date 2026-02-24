import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale") || "en";

  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    // Fallback to English if locale file doesn't exist
    messages = (await import(`../../../messages/en.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
