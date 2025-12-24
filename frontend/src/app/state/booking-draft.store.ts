import { Injectable } from "@angular/core";

export type ServiceType = "WASH_FULL" | "REVIEW";

export interface BookingDraft {
  serviceType?: ServiceType;
  makeId?: number;
  makeName?: string;
  modelId?: number;
  modelName?: string;
  imageKey?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  plate?: string;
  notes?: string;
}

const KEY = "rizza_booking_draft";

@Injectable({ providedIn: "root" })
export class BookingDraftStore {
  get(): BookingDraft {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }
  set(patch: Partial<BookingDraft>) {
    const next = { ...this.get(), ...patch };
    sessionStorage.setItem(KEY, JSON.stringify(next));
  }
  clear() { sessionStorage.removeItem(KEY); }
}
