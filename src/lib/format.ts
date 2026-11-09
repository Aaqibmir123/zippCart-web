export const money = (amount: number) =>
  `\u20b9${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
