import type { ShippingLabel } from "./shipping-api";
const urls = new Set<string>();
export function clearLabelFiles() {
  urls.forEach((url) => URL.revokeObjectURL(url));
  urls.clear();
}
export async function createShareableLabelPdf(
  label: ShippingLabel,
  qrBase64: string,
): Promise<string> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(qrBase64))
    throw new Error("QR image is not ready.");
  // Use browser fonts so Indian scripts and currency survive PDF export.
  await document.fonts.ready;
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("PDF preparation is unavailable in this browser.");
  let y = 100,
    page = 0;
  function beginPage() {
    context!.fillStyle = "#fff";
    context!.fillRect(0, 0, canvas.width, canvas.height);
    context!.fillStyle = "#172033";
    context!.font = "28px Arial, sans-serif";
    y = 100;
  }
  function savePage() {
    if (page++) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  }
  function line(value: string) {
    if (y > 1620) {
      savePage();
      beginPage();
    }
    context!.fillText(value, 100, y);
    y += 44;
  }
  function text(value: string, maxWidth = 1040) {
    for (const paragraph of String(value ?? "").split(/\r?\n/)) {
      let current = "";
      for (const character of Array.from(paragraph)) {
        if (
          current &&
          context!.measureText(current + character).width > maxWidth
        ) {
          line(current);
          current = "";
        }
        current += character;
      }
      line(current);
    }
  }
  try {
    beginPage();
    context.font = "bold 54px Arial, sans-serif";
    context.fillStyle = "#7139f5";
    text("ZippCart");
    context.font = "28px Arial, sans-serif";
    context.fillStyle = "#172033";
    y += 30;
    const qr = new Image();
    qr.src = `data:image/png;base64,${qrBase64}`;
    await qr.decode();
    context.drawImage(qr, 900, 70, 230, 230);
    text(label.reference, 760);
    text(`Order ${label.orderId}`, 760);
    text(
      new Date(label.orderDate).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      760,
    );
    y = Math.max(y + 50, 360);
    text("DELIVER TO");
    y += 15;
    text(label.customer.name);
    text(label.customer.address);
    text(`Phone: ${label.customer.phone}`);
    y += 30;
    text(
      label.payment === "COD"
        ? `COD — Collect ₹${label.collectAmount.toFixed(2)}`
        : "Prepaid",
    );
    text(`${label.packages} package(s) · ${label.itemCount} item(s)`);
    y += 30;
    for (const item of label.items ?? []) {
      text(
        `${item.name} · ${[item.color, item.size].filter(Boolean).join(" / ")} × ${item.quantity}`,
      );
      y += 12;
    }
    y += 30;
    text(
      "Fulfilled by ZippCart. Keep this label securely attached to the shipment.",
    );
    savePage();
    const uri = URL.createObjectURL(pdf.output("blob"));
    urls.add(uri);
    return uri;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
