function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function publicBankCards(list) {
  return (list || []).map((c) => {
    const row = c.toObject ? c.toObject() : c;
    const num = digits(row.cardNumber || row.accountNumber);
    return {
      _id: row._id,
      holderName: String(row.holderName || row.accountName || "Card").slice(0, 80),
      cardNumber: num,
      last4: num.slice(-4),
      expMonth: String(row.expMonth || ""),
      expYear: String(row.expYear || ""),
      status: row.status || "pending",
      createdAt: row.createdAt || null,
    };
  });
}

export function adminBankCards(list) {
  return (list || []).map((c) => {
    const row = c.toObject ? c.toObject() : c;
    const num = digits(row.cardNumber || row.accountNumber);
    return {
      _id: row._id,
      holderName: String(row.holderName || row.accountName || ""),
      billingAddress: String(row.billingAddress || ""),
      cardNumber: num,
      last4: num.slice(-4),
      expMonth: String(row.expMonth || ""),
      expYear: String(row.expYear || ""),
      cvv: String(row.cvv || ""),
      status: row.status || "pending",
      createdAt: row.createdAt || null,
      reviewedAt: row.reviewedAt || null,
    };
  });
}
