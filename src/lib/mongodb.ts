import { MongoClient, Db } from "mongodb";

// Global singleton for MongoDB connection (works in both dev and prod)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "cutting_stock";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in environment variables");
}

const options = {
  maxPoolSize: 5,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 10000,
};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development, use global to preserve across hot reloads
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
    global._mongoClient = client;
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, also use singleton (not per-request)
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
    global._mongoClient = client;
  }
  clientPromise = global._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGODB_DB);
}

export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db(MONGODB_DB);
  return { client, db };
}

export { clientPromise };
