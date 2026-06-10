import { LocalStorage, environment } from "@raycast/api";
import { SAPSystem, SystemType } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const SYSTEMS_KEY = "sap-systems";
const ENCRYPTION_KEY_STORAGE = "sap-encryption-key";

export const SYSTEM_TYPES: SystemType[] = ["E", "Q", "P", "S"];

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  E: "Entwicklung",
  Q: "Qualitätssicherung",
  P: "Produktiv",
  S: "Sonstiges",
};

function isSystemType(value: unknown): value is SystemType {
  return value === "E" || value === "Q" || value === "P" || value === "S";
}

export interface LanguageOption {
  value: string;
  title: string;
}

// Languages offered in the forms and in the connect-time language picker.
export const LANGUAGES: LanguageOption[] = [
  { value: "EN", title: "English (EN)" },
  { value: "DE", title: "German (DE)" },
  { value: "FR", title: "French (FR)" },
  { value: "ES", title: "Spanish (ES)" },
  { value: "IT", title: "Italian (IT)" },
  { value: "PT", title: "Portuguese (PT)" },
  { value: "NL", title: "Dutch (NL)" },
  { value: "PL", title: "Polish (PL)" },
  { value: "RU", title: "Russian (RU)" },
  { value: "ZH", title: "Chinese (ZH)" },
  { value: "JA", title: "Japanese (JA)" },
  { value: "KO", title: "Korean (KO)" },
];

let cachedEncryptionKey: Buffer | null = null;
let keyInitPromise: Promise<Buffer> | null = null;

async function getOrCreateEncryptionKey(): Promise<Buffer> {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  // Prevent race condition by reusing the same promise for concurrent calls
  if (keyInitPromise) {
    return keyInitPromise;
  }

  keyInitPromise = (async () => {
    const storedKey = await LocalStorage.getItem<string>(ENCRYPTION_KEY_STORAGE);

    if (storedKey) {
      cachedEncryptionKey = Buffer.from(storedKey, "hex");
      return cachedEncryptionKey;
    }

    // Generate a unique 32-byte key for this installation
    const newKey = crypto.randomBytes(32);
    await LocalStorage.setItem(ENCRYPTION_KEY_STORAGE, newKey.toString("hex"));
    cachedEncryptionKey = newKey;
    return newKey;
  })();

  try {
    return await keyInitPromise;
  } finally {
    keyInitPromise = null;
  }
}

export async function encryptPassword(password: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const key = await getOrCreateEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key as crypto.CipherKey, iv as crypto.BinaryLike);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    if (!encryptedPassword || !encryptedPassword.includes(":")) {
      return "";
    }
    const parts = encryptedPassword.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return "";
    }
    const [ivHex, encrypted] = parts;
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
      return "";
    }
    const iv = Buffer.from(ivHex, "hex");
    const key = await getOrCreateEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key as crypto.CipherKey, iv as crypto.BinaryLike);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

// Validates the fields that have existed since the first version. The newer
// fields (customerName, systemType) are intentionally NOT required here so that
// systems stored before they existed are not silently dropped — they get
// sensible defaults during the migration step in getSAPSystems().
function isValidStoredSystem(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) return false;
  const system = obj as Record<string, unknown>;
  return (
    typeof system.id === "string" &&
    typeof system.systemId === "string" &&
    typeof system.applicationServer === "string" &&
    typeof system.instanceNumber === "string" &&
    typeof system.client === "string" &&
    typeof system.username === "string" &&
    typeof system.language === "string" &&
    typeof system.createdAt === "string" &&
    typeof system.updatedAt === "string"
  );
}

// Fill in fields added in later versions so the rest of the app can assume they
// are always present.
function migrateStoredSystem(system: Record<string, unknown>): SAPSystem {
  return {
    ...(system as unknown as SAPSystem),
    customerName: typeof system.customerName === "string" ? system.customerName : "",
    systemType: isSystemType(system.systemType) ? system.systemType : "P",
  };
}

export async function getSAPSystems(): Promise<SAPSystem[]> {
  const systemsJson = await LocalStorage.getItem<string>(SYSTEMS_KEY);
  if (!systemsJson) return [];
  try {
    const parsed = JSON.parse(systemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredSystem).map(migrateStoredSystem);
  } catch {
    return [];
  }
}

export async function saveSAPSystems(systems: SAPSystem[]): Promise<void> {
  await LocalStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
}

const SYSTEM_TYPE_ORDER: Record<SystemType, number> = { E: 0, Q: 1, P: 2, S: 3 };

// Group systems by customer (alphabetically), with systems inside each customer
// ordered E → Q → P. Systems without a customer name are collected under a
// fallback heading at the end.
export function groupSystemsByCustomer(systems: SAPSystem[]): { customerName: string; systems: SAPSystem[] }[] {
  const groups = new Map<string, SAPSystem[]>();
  for (const system of systems) {
    const key = system.customerName.trim() || "Ungrouped";
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(system);
    } else {
      groups.set(key, [system]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === "Ungrouped") return 1;
      if (b === "Ungrouped") return -1;
      return a.localeCompare(b);
    })
    .map(([customerName, customerSystems]) => ({
      customerName,
      systems: customerSystems.sort(
        (a, b) =>
          SYSTEM_TYPE_ORDER[a.systemType] - SYSTEM_TYPE_ORDER[b.systemType] || a.systemId.localeCompare(b.systemId),
      ),
    }));
}

export async function getPassword(systemId: string): Promise<string> {
  const encryptedPassword = await LocalStorage.getItem<string>(`password-${systemId}`);
  if (!encryptedPassword) return "";
  return await decryptPassword(encryptedPassword);
}

export async function savePassword(systemId: string, password: string): Promise<void> {
  const encrypted = await encryptPassword(password);
  await LocalStorage.setItem(`password-${systemId}`, encrypted);
}

export async function deletePassword(systemId: string): Promise<void> {
  await LocalStorage.removeItem(`password-${systemId}`);
}

export async function addSAPSystem(
  system: Omit<SAPSystem, "id" | "createdAt" | "updatedAt">,
  password: string,
): Promise<SAPSystem> {
  const systems = await getSAPSystems();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newSystem: SAPSystem = {
    ...system,
    id,
    createdAt: now,
    updatedAt: now,
  };

  systems.push(newSystem);
  await saveSAPSystems(systems);
  await savePassword(id, password);

  return newSystem;
}

export async function updateSAPSystem(
  id: string,
  updates: Partial<Omit<SAPSystem, "id" | "createdAt">>,
  password?: string,
): Promise<void> {
  const systems = await getSAPSystems();
  const index = systems.findIndex((s) => s.id === id);

  if (index !== -1) {
    systems[index] = {
      ...systems[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveSAPSystems(systems);

    if (password !== undefined) {
      await savePassword(id, password);
    }
  }
}

export async function deleteSAPSystem(id: string): Promise<void> {
  const systems = await getSAPSystems();
  const filtered = systems.filter((s) => s.id !== id);
  await saveSAPSystems(filtered);
  await deletePassword(id);
}

// Sanitize filename to prevent path traversal attacks
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// Encode value for SAP connection string (avoid breaking on special chars)
function encodeSAPValue(value: string): string {
  return value.replace(/&/g, "%26").replace(/=/g, "%3D");
}

export async function createAndOpenSAPCFile(system: SAPSystem, languageOverride?: string): Promise<string> {
  const password = await getPassword(system.id);

  // A language passed at connect time wins over the (possibly empty) stored one.
  const language = (languageOverride ?? system.language).trim();

  // Build the connection string with encoded values
  // Format: conn=/H/{application server}/S/32{instance number}&user={username}&lang={language}&clnt={client}&pass={password}
  // The lang parameter is omitted entirely when no language is set, so the SAP
  // GUI falls back to its own language selection.
  const langPart = language ? `&lang=${encodeSAPValue(language)}` : "";
  const connectionString = `conn=/H/${encodeSAPValue(system.applicationServer)}/S/32${encodeSAPValue(system.instanceNumber)}&user=${encodeSAPValue(system.username)}${langPart}&clnt=${encodeSAPValue(system.client)}&pass=${encodeSAPValue(password)}`;

  // Use Raycast's support path for temp files (more appropriate than os.tmpdir)
  const tempDir = path.join(environment.supportPath, "sapc-files");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Sanitize filename to prevent path injection
  const sanitizedSystemId = sanitizeFilename(system.systemId);
  const sanitizedClient = sanitizeFilename(system.client);
  const fileName = `${sanitizedSystemId}_${sanitizedClient}.sapc`;
  const filePath = path.join(tempDir, fileName);

  // Write file with restrictive permissions (owner read/write only)
  fs.writeFileSync(filePath, connectionString, { encoding: "utf8", mode: 0o600 });

  // Schedule cleanup after 5 seconds to remove sensitive data from disk
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }, 5000);

  return filePath;
}

// Clean up SAPC files to remove sensitive data from disk
export function cleanupSAPCFiles(): void {
  try {
    const tempDir = path.join(environment.supportPath, "sapc-files");
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        if (file.endsWith(".sapc")) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function validateInstanceNumber(value: string): string | undefined {
  if (!/^\d{2}$/.test(value)) {
    return "Instance number must be exactly 2 digits (e.g., 00, 01, 99)";
  }
  return undefined;
}

export function validateClient(value: string): string | undefined {
  if (!/^\d{3}$/.test(value)) {
    return "Client must be exactly 3 digits (e.g., 100, 800)";
  }
  return undefined;
}
