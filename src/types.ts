export type SystemType = "E" | "Q" | "P" | "S";

export interface SAPSystem {
  id: string;
  customerName: string;
  systemId: string;
  systemType: SystemType;
  applicationServer: string;
  instanceNumber: string;
  client: string;
  username: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface SAPSystemFormValues {
  customerName: string;
  systemId: string;
  systemType: SystemType;
  applicationServer: string;
  instanceNumber: string;
  client: string;
  username: string;
  password: string;
  language: string;
}
