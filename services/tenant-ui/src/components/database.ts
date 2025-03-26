import config from "config";
import { createPool, Pool } from "mysql2/promise";

// Create a connection pool for database access
const pool: Pool = createPool({
  host: config.get("database.host"),
  user: config.get("database.user"),
  password: config.get("database.password"),
  database: config.get("database.name"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Get all items from the items table
 * @returns {Promise<Array>} The array of items
 */
export const getAllItems = async () => {
  try {
    const [rows] = await pool.query("SELECT * FROM items");
    return rows;
  } catch (error) {
    console.error(`Error fetching items: ${error}`);
    throw error;
  }
};

/**
 * Get a specific item by ID
 * @param {number} id The item ID to retrieve
 * @returns {Promise<Object>} The item object
 */
export const getItemById = async (id: number) => {
  try {
    const [rows] = await pool.query("SELECT * FROM items WHERE id = ?", [id]);
    const items = rows as any[];
    return items.length ? items[0] : null;
  } catch (error) {
    console.error(`Error fetching item by ID: ${error}`);
    throw error;
  }
}; 