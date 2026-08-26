import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "uz" | "ru")) {
    locale = routing.defaultLocale;
  }

  const messages =
    locale === "ru"
      ? (await import("../messages/ru.json")).default
      : (await import("../messages/uz.json")).default;

  return {
    locale,
    messages,
  };
});
