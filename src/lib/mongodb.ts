import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(process.env.MONGODB_DB || "cutting_stock");

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getMongoDb() {
  const { db } = await connectToDatabase();
  return db;
}

export async function closeMongoConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
