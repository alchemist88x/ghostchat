import { MongoClient, Db, ObjectId } from "mongodb";
import dns from "dns";

// Force Google Public DNS globally to bypass ISP DNS issues with MongoDB SRV lookups
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoClient: MongoClient | undefined;
  var _mongoIndexesEnsured: boolean | undefined;
}

// Connection options tuned for unreliable networks (ISP blocking port 27017 intermittently)
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  // Long timeouts — the ISP intermittently blocks port 27017, so we need patience
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  // Keep idle connections alive so we don't have to re-establish through flaky network
  maxIdleTimeMS: 120000,
  // Retry on transient network failures
  retryWrites: true,
  retryReads: true,
  // Faster heartbeat to detect recovered connections sooner
  heartbeatFrequencyMS: 5000,
};

let moduleClient: MongoClient | null = null;
let moduleClientPromise: Promise<MongoClient> | null = null;

/**
 * Build the connection string.
 *
 * If the env var uses `mongodb+srv://` with this specific Atlas cluster we
 * rewrite it to a direct replica-set URI so the driver never needs to do a
 * DNS SRV lookup (which fails on many Windows ISP networks).
 */
function getConnectionString(): string {
  const raw = process.env.MONGODB_URI || "";
  if (!raw) return "";

  // Rewrite SRV → direct replica set for THIS cluster to bypass DNS SRV issues
  if (raw.startsWith("mongodb+srv://") && raw.includes("portfolio.qowmuzl.mongodb.net")) {
    const m = raw.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@portfolio\.qowmuzl\.mongodb\.net\/?([^?]*)/);
    if (m) {
      const [, user, pass, dbPart] = m;
      const db = dbPart || "ghostchat";
      return [
        `mongodb://${user}:${pass}@`,
        "ac-8zbodwv-shard-00-00.qowmuzl.mongodb.net:27017,",
        "ac-8zbodwv-shard-00-01.qowmuzl.mongodb.net:27017,",
        "ac-8zbodwv-shard-00-02.qowmuzl.mongodb.net:27017/",
        `${db}?ssl=true&replicaSet=atlas-p6al8e-shard-0`,
        "&authSource=admin&retryWrites=true&w=majority",
      ].join("");
    }
  }

  return raw;
}

/**
 * Connect with automatic retry.
 *
 * On flaky networks the first attempt often fails because all 3 shard TCP
 * handshakes time out simultaneously. A second attempt 2-3 seconds later
 * frequently succeeds because the ISP-level throttle has cleared.
 */
async function connectWithRetry(uri: string, maxRetries = 3): Promise<MongoClient> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const c = new MongoClient(uri, options);
      await c.connect();
      if (attempt > 1) {
        console.log(`✅ [MongoDB] Connected on attempt ${attempt}`);
      }
      return c;
    } catch (err) {
      lastErr = err;
      console.warn(
        `⚠️ [MongoDB] Connection attempt ${attempt}/${maxRetries} failed:`,
        (err as Error).message
      );
      if (attempt < maxRetries) {
        // Exponential back-off: 2s, 4s
        const delay = attempt * 2000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

export async function getMongoClient(): Promise<MongoClient> {
  const connectionUri = getConnectionString();
  if (!connectionUri) {
    throw new Error(
      "MONGODB_URI environment variable is not defined. Please set it in .env.local or your hosting environment variables."
    );
  }

  // Re-apply Google DNS before every connection attempt
  try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch {}

  if (process.env.NODE_ENV === "development") {
    // In dev, persist across HMR reloads via globalThis
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connectWithRetry(connectionUri);
    }
    try {
      return await global._mongoClientPromise;
    } catch {
      // Clear so next request retries fresh
      global._mongoClient = undefined;
      global._mongoClientPromise = undefined;
      // One more synchronous retry right now
      global._mongoClientPromise = connectWithRetry(connectionUri);
      return await global._mongoClientPromise;
    }
  } else {
    // Production (Vercel serverless)
    if (!moduleClientPromise) {
      moduleClientPromise = connectWithRetry(connectionUri);
    }
    try {
      return await moduleClientPromise;
    } catch {
      moduleClient = null;
      moduleClientPromise = connectWithRetry(connectionUri);
      return await moduleClientPromise;
    }
  }
}

export async function getDb(dbName?: string): Promise<Db> {
  const connectedClient = await getMongoClient();
  const db = dbName ? connectedClient.db(dbName) : connectedClient.db();

  // Ensure TTL and performance indexes once per process lifetime
  if (!global._mongoIndexesEnsured) {
    try {
      await ensureIndexes(db);
      global._mongoIndexesEnsured = true;
    } catch (err) {
      console.warn("MongoDB index initialization notice:", err);
    }
  }

  return db;
}

export async function ensureIndexes(db: Db): Promise<void> {
  const chatsCol = db.collection("chats");
  const participantsCol = db.collection("participants");
  const messagesCol = db.collection("messages");
  const attachmentsCol = db.collection("attachments");
  const reportsCol = db.collection("reports");

  await Promise.all([
    chatsCol.createIndex({ publicToken: 1 }, { unique: true }),
    chatsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    chatsCol.createIndex({ status: 1 }),

    participantsCol.createIndex({ chatId: 1 }),
    participantsCol.createIndex({ chatId: 1, sessionHash: 1 }),
    participantsCol.createIndex({ lastSeenAt: 1 }),

    messagesCol.createIndex({ chatId: 1, createdAt: -1 }),
    messagesCol.createIndex({ chatId: 1, expiresAt: 1 }),
    messagesCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    messagesCol.createIndex({ clientMessageId: 1, chatId: 1 }, { unique: true, sparse: true }),

    attachmentsCol.createIndex({ chatId: 1 }),
    attachmentsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    reportsCol.createIndex({ chatId: 1 }),
  ]);
}

export { ObjectId };
