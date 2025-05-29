import { Timestamp } from "firebase/firestore";

export function earliest(a?: Timestamp, b?: Date): Timestamp {
  if (!a && !b) throw new Error('Both dates are undefined');
  if (!a) return Timestamp.fromDate(b!);
  if (!b) return a;
  return a.toDate() < b ? a : Timestamp.fromDate(b);
}

export function latest(a?: Timestamp, b?: Date): Timestamp {
  if (!a && !b) throw new Error('Both dates are undefined');
  if (!a) return Timestamp.fromDate(b!);
  if (!b) return a;
  return a.toDate() > b ? a : Timestamp.fromDate(b);
}
