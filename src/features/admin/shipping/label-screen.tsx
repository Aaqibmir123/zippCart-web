"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { adminShippingApi, type ShippingLabel } from "./shipping-api";
import { clearLabelFiles, createShareableLabelPdf } from "./label-pdf";
import { labelHtml } from "./label-html";
import {
  Button,
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";
import { money } from "../../../lib/format";
function LabelContent({ label }: { label: ShippingLabel }) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    void import("qrcode")
      .then((module) =>
        module.default.toDataURL(label.qrValue, {
          width: 600,
          margin: 10,
          errorCorrectionLevel: "M",
        }),
      )
      .then((data) => {
        if (active) setQr(data);
      })
      .catch(() => {
        if (active)
          setError("Could not prepare QR code. Refresh and try again.");
      });
    return () => {
      active = false;
      clearLabelFiles();
    };
  }, [label.qrValue]);
  async function exportPdf(share: boolean) {
    if (lock.current || !qr) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const uri = await createShareableLabelPdf(label, qr.split(",")[1]);
      const name = `ZippCart-${label.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      const file = new File([await (await fetch(uri)).blob()], name, {
        type: "application/pdf",
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "ZippCart shipping label",
          });
          return;
        } catch (cause) {
          if (cause instanceof Error && cause.name === "AbortError") return;
        }
      }
      const anchor = document.createElement("a");
      anchor.href = uri;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not export label.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function print() {
    if (!qr || lock.current) return;
    // Reserve the window inside the click gesture, before any asynchronous work.
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("Allow popups to print, or download the PDF.");
      return;
    }
    popup.opener = null;
    try {
      popup.document.open();
      popup.document.write(labelHtml(label, qr.split(",")[1]));
      popup.document.close();
      await Promise.all(
        Array.from(popup.document.images).map((image) =>
          image.decode().catch(() => undefined),
        ),
      );
      await popup.document.fonts.ready;
      popup.focus();
      popup.print();
    } catch {
      popup.close();
      setError(
        "Could not open print. Download the PDF and print it from your viewer.",
      );
    }
  }
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-2xl font-black text-purple-800">ZippCart</h2>
            <p className="mt-3 font-bold">{label.reference}</p>
            <p className="mt-2 break-all text-xs">Order {label.orderId}</p>
            <p className="mt-2 text-sm">
              {new Date(label.orderDate).toLocaleDateString("en-IN")}
            </p>
          </div>
          {qr && (
            <img src={qr} alt="Shipping QR code" width={124} height={124} />
          )}
        </div>
        <h3 className="mb-3 mt-7 font-bold">Deliver to</h3>
        <Details
          values={{
            Customer: label.customer.name,
            Address: label.customer.address,
            Phone: label.customer.phone,
            Payment:
              label.payment === "COD"
                ? `COD · Collect ${money(label.collectAmount)}`
                : "Prepaid",
            Packages: label.packages,
            Items: label.itemCount,
          }}
        />
        <div className="mt-6 space-y-3">
          {label.items?.map((item, index) => (
            <p key={index} className="text-sm">
              {item.name} ·{" "}
              {[item.color, item.size].filter(Boolean).join(" / ")} ×{" "}
              {item.quantity}
            </p>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Fulfilled by ZippCart. Keep this label securely attached to the
          shipment.
        </p>
      </Card>
      {error && <Notice error>{error}</Notice>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button disabled={!qr || busy} onClick={() => void print()}>
          Print label
        </Button>
        <Button
          variant="secondary"
          disabled={!qr || busy}
          onClick={() => void exportPdf(true)}
        >
          Share PDF
        </Button>
        <Button
          variant="secondary"
          disabled={!qr || busy}
          onClick={() => void exportPdf(false)}
        >
          Download PDF
        </Button>
      </div>
    </>
  );
}
export function LabelScreen({ id }: { id: string }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-label", user?.id, id],
    queryFn: () => adminShippingApi.getLabel(id),
    enabled: !user?.reviewer,
    gcTime: 0,
  });
  return (
    <>
      <Link
        prefetch={false}
        href={`/admin/shipping/${id}`}
        className="mb-5 inline-block text-purple-800"
      >
        ← Order details
      </Link>
      <Heading
        title="Shipping label"
        description="Preview, print or share a PDF."
      />
      {user?.reviewer ? (
        <Notice>Shipping labels are unavailable for reviewer sessions.</Notice>
      ) : (
        <>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
          />
          {query.data && <LabelContent label={query.data.label} />}
        </>
      )}
    </>
  );
}
