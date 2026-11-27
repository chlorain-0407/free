import { MongoClient } from "mongodb";
import type { Db } from "mongodb";

const DB_NAME = "e8346c_free";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __mongoIndexesPromise: Promise<void> | undefined;
}

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new DatabaseConfigError(
      "尚未設定 MONGODB_URI 密鑰，請於 Settings → Secrets 新增 MONGODB_URI 後重新整理頁面。"
    );
  }

  if (!globalThis.__mongoClient) {
    globalThis.__mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
    });
  }
  return globalThis.__mongoClient;
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db
      .collection("signatures")
      .createIndex({ profileKey: 1 }, { unique: true }),
    db
      .collection("favorite_templates")
      .createIndex({ templateId: 1 }, { unique: true }),
    db.collection("favorite_templates").createIndex({ createdAt: -1 }),
    db.collection("drafts").createIndex({ createdAt: -1 }),
    db.collection("drafts").createIndex({ isFavorite: 1, createdAt: -1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = getMongoClient();
  const db = client.db(DB_NAME);

  if (!globalThis.__mongoIndexesPromise) {
    globalThis.__mongoIndexesPromise = ensureIndexes(db).catch((err) => {
      globalThis.__mongoIndexesPromise = undefined;
      throw err;
    });
  }
  await globalThis.__mongoIndexesPromise;

  return db;
}

export async function initDatabaseOnStartup(): Promise<void> {
  if (!process.env.MONGODB_URI?.trim()) {
    console.warn(
      "[MongoDB] MONGODB_URI is not configured yet. Waiting for Settings -> Secrets configuration."
    );
    return;
  }
  try {
    await getDb();
    console.log(`[MongoDB] Connected and verified indexes on database "${DB_NAME}".`);
  } catch {
    console.error(
      "[MongoDB] Startup connection check failed. Requests will retry automatically."
    );
  }
}
