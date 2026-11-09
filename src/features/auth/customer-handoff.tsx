"use client";
import { useState } from "react";
import { Button } from "../../components/ui";
import { Dialog } from "../../components/dialog";

/** Admin information only; web no longer switches the account into customer mode. */
export function CustomerHandoff() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Customer app
      </Button>
      {open && (
        <Dialog
          title="Continue in the ZippCart app"
          onClose={() => setOpen(false)}
        >
          <p className="text-sm leading-7">
            Open the ZippCart mobile app for shopping and personal orders. Your
            existing account and permissions are preserved.
          </p>
        </Dialog>
      )}
    </>
  );
}
