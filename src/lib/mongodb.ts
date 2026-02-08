import { MongoClient, Db } from "mongodb";

// Global singleton for MongoDB connection (works in both dev and prod)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_DB = process.env.MONGODB_DB || "cutting_stock";

const options = {
  maxPoolSize: 5,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 10000,
};

function getMongoClient(): Promise<MongoClient> {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in environment variables");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
    global._mongoClient = client;
  }
  
  return global._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(MONGODB_DB);
}

export async function connectToDatabase() {
  const client = await getMongoClient();
  const db = client.db(MONGODB_DB);
  return { client, db };
}

// For backwards compatibility
export const clientPromise = {
  then: (resolve: (client: MongoClient) => void, reject: (err: Error) => void) => {
    getMongoClient().then(resolve).catch(reject);
  }
};
