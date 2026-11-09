import type { ShippingLabel } from "./shipping-api";

export const escapeLabelText = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

export function labelHtml(label: ShippingLabel, qrBase64: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(qrBase64))
    throw new Error("QR image is not ready. Please try again.");
  const e = escapeLabelText;
  const date = new Date(label.orderDate).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const amount =
    label.payment === "COD"
      ? `Collect INR ${label.collectAmount.toFixed(2)}`
      : "Prepaid";
  const items = (label.items ?? [])
    .map(
      (item) =>
        `<tr><td>${e(item.name)}<small>${e([item.color, item.size].filter(Boolean).join(" / "))}</small></td><td class="qty">${e(item.quantity)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #172033; margin: 0; font-size: 13px; }
    .label { border: 2px solid #172033; padding: 22px; } h1 { font-size: 28px; margin: 0; } h2 { font-size: 22px; margin: 8px 0; }
    .brand { color: #7139f5; } .tag { color: #606675; font-size: 11px; margin-top: 5px; }
    .header { width: 100%; border-bottom: 2px solid #172033; padding-bottom: 16px; } .header td { vertical-align: top; }
    .qr { width: 124px; height: 124px; } .qr-cell { width: 140px; text-align: right; }
    .caption { font-size: 10px; letter-spacing: 1.4px; font-weight: bold; color: #606675; margin-top: 18px; }
    .reference { font-size: 17px; font-weight: bold; margin-top: 6px; overflow-wrap: anywhere; }
    .address { font-size: 16px; line-height: 1.6; white-space: pre-line; overflow-wrap: anywhere; }
    .payment { border: 1px solid #172033; padding: 14px; margin: 18px 0; font-size: 18px; font-weight: bold; }
    .items { border-collapse: collapse; width: 100%; margin-top: 14px; } .items td,.items th { border-bottom: 1px solid #ddd; padding: 9px 0; text-align: left; }
    .items .qty { text-align: right; width: 40px; } small { display: block; color: #606675; margin-top: 4px; }
    tr,.payment,.recipient { break-inside: avoid; } thead { display: table-header-group; } .footer { margin-top: 18px; font-size: 10px; color: #606675; }
  </style></head><body><main class="label">
    <table class="header"><tr><td><h1 class="brand">ZippCart</h1><div class="tag">Shop smart. Delivered with care.</div><div class="caption">SHIPPING LABEL</div><div class="reference">${e(label.reference)}</div><small>Order ${e(label.orderId)}<br/>${e(date)}</small></td>
    <td class="qr-cell"><img class="qr" alt="Shipping QR code" src="data:image/png;base64,${qrBase64}"/><small>Scan shipment reference</small></td></tr></table>
    <section class="recipient"><div class="caption">DELIVER TO</div><h2>${e(label.customer.name)}</h2><div class="address">${e(label.customer.address)}</div><p>Phone: ${e(label.customer.phone)}</p></section>
    <div class="payment">${e(label.payment)} &nbsp; | &nbsp; ${e(amount)}</div>
    <p>${e(label.packages)} package(s) &nbsp; • &nbsp; ${e(label.itemCount)} item(s)</p>
    ${items ? `<table class="items"><thead><tr><th>Package contents</th><th class="qty">Qty</th></tr></thead><tbody>${items}</tbody></table>` : ""}
    <div class="footer">Fulfilled by ZippCart. Keep this label securely attached to the shipment.</div>
  </main></body></html>`;
}
