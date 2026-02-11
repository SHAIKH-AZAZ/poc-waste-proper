import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
console.log("Testing connection with:", connectionString);

if (!connectionString) {
    console.error("DATABASE_URL is undefined");
    process.exit(1);
}

const pool = new Pool({ connectionString });

pool.connect().then(client => {
    console.log("Connected successfully");
    client.release();
    process.exit(0);
}).catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
});
