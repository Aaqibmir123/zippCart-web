export type LocationSample = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

export type LocationCapture =
  | { status: "captured"; sample: LocationSample }
  | { status: "denied" | "unavailable" | "skipped" };

export type OrderLocation = LocationCapture | { status: "not_requested" };
