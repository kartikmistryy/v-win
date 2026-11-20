export type Role =
  | "BD"
  | "Procurement"
  | "Finance"
  | "Branding"
  | "Operations"
  | "Technology"
  | "Legal"
  | "Mobilisation"
  | "Leadership";

export type GateNo = 1 | 2 | 3 | 4;
export type GateState = "not_reached" | "waiting" | "cleared" | "rejected";
export type Gate4Outcome = "accept" | "hold" | "reject";
export type Temperature = "Cold" | "Warm" | "Hot" | "Won";
export type DealStatus = "Open" | "On hold" | "Lost" | "In mobilisation" | "Live";
export type MachineType = "Seaga" | "TCN" | "XY" | "ICM";
export type DeployKey = "installed" | "configured" | "stocked" | "cashlessTested";

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  gst: string;
  customerType: string;
  contacts: Contact[];
}

export interface ProductLine {
  id: string;
  product: string;
  qty: number;
  available?: boolean;
  marginPct?: number;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  footfall: number;
  machinePoints: number;
  machineType: MachineType;
  brandingAllowed: boolean;
  photos: string[]; // small data-URL thumbnails
  productLines: ProductLine[];
  deployment: Record<DeployKey, boolean>;
}

export interface Gate {
  no: GateNo;
  state: GateState;
  outcome?: Gate4Outcome;
  decidedBy?: string;
  decidedRole?: Role;
  decidedAt?: string;
  reasonCode?: string;
  comment?: string;
  followUpDate?: string;
  override?: boolean;
  reopened?: boolean;
}

export interface Viability {
  minimum: number;
  proposed: number;
  brandingOffset: number;
}

export interface OpsReadiness {
  route: string;
  manpower: number;
  machines: number;
  goLiveDate: string;
}

export interface TechReadiness {
  configuration: string;
  telemetryOk: boolean;
  cashlessOk: boolean;
}

export interface AgreementVersion {
  version: number;
  fileName: string;
  approvedTermsStamp: string;
  signed: boolean;
  uploadedAt: string;
  uploadedBy: string;
}

export interface HypercareLog {
  id: string;
  day: number;
  issue: string;
  fix: string;
  clientCheckIn: boolean;
  by: string;
  at: string;
}

export interface Signature {
  by: string;
  at: string;
}

export interface DocFile {
  id: string;
  name: string;
  kind: string;
  by: string;
  at: string;
}

export interface Comment {
  id: string;
  by: string;
  role: Role;
  text: string;
  at: string;
}

export interface Deal {
  id: string;
  client: Client;
  ownerName: string;
  channel: string;
  subChannel: string;
  zone: string;
  city: string;
  leadSource: string;
  currentStage: number; // 1–14 (6 = readiness phase covering stages 6 & 7)
  status: DealStatus;
  sites: Site[];
  stageDone: Record<number, boolean>; // sub-step flags (e.g. profile complete)
  productMixSubmittedAt?: string;
  brandingConfirmed?: boolean;
  viability: Viability;
  ops?: OpsReadiness;
  tech?: TechReadiness;
  gates: Gate[]; // always 4
  legalLocked: boolean;
  agreements: AgreementVersion[];
  hypercareStart?: string;
  hypercare: HypercareLog[];
  handover: { Mobilisation?: Signature; Operations?: Signature; Finance?: Signature };
  documents: DocFile[];
  comments: Comment[];
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  dealId: string;
  user: string;
  role: Role;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  at: string;
}

export interface Notification {
  id: string;
  toRole: Role;
  text: string;
  dealId?: string;
  at: string;
  read: boolean;
}
