import { money } from "../format";

export const cash = (paise: number) => money(paise / 100);
export const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
