/**
 * Formats a Date object to a string based on the specified locales and options.
 */
export function formatDate(
  date: Date,
  locales: string = "zh-CN",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
) {
  return date.toLocaleDateString(locales, options).replaceAll("/", " - ");
}
