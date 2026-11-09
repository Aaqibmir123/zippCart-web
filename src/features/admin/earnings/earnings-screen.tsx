"use client";
import { useState } from "react";
import { EarningsStatement } from "../../../components/earnings-statement";
import { RecordPayment, type PaymentTarget } from "./record-payment";
export function AdminEarningsScreen() {
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  return (
    <>
      <EarningsStatement
        admin
        onPay={(store) => setTarget({ store })}
        onCollect={(orderId) => setTarget({ orderId })}
      />
      {target && (
        <RecordPayment target={target} close={() => setTarget(null)} />
      )}
    </>
  );
}
