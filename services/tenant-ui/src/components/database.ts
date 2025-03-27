import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a database configuration from environment variables
const dbConfig = {
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DB || 'askar-wallet',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD || 'postgresPass',
};

// Create a pool instance
const pool = new Pool(dbConfig);

// Log connection info on startup (hide password)
console.log('Database: Connecting with parameters:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
});

/**
 * Get all items from the postgres.items table with formatted binary data
 * @returns {Promise<Array>} The array of items with formatted data
 */
export const getAllItems = async () => {
  console.log('Database: Executing getAllItems query from postgres schema');
  
  try {
    // Remove created_at and updated_at columns that don't exist
    const result = await pool.query(`
      SELECT 
        id,
        kind,
        profile_id,
        encode(category, 'hex') as category_hex,
        encode(name, 'escape') as name_text,
        encode(value, 'escape') as value_text
      FROM 
        postgres.items
    `);
    
    console.log('Database: Query returned', result.rows.length, 'rows');
    
    // Format the results to be more readable
    const formattedItems = result.rows.map(item => ({
      id: item.id,
      kind: formatKind(item.kind),
      profile_id: item.profile_id,
      category: item.category_hex,
      name: item.name_text || '[Binary data]',
      value: item.value_text || '[Binary data]'
    }));
    
    return formattedItems;
  } catch (error) {
    console.error('Database: Error fetching items:', error);
    throw error;
  }
};

/**
 * Format kind value to be more readable
 */
function formatKind(kind: number): string {
  const kinds: Record<number, string> = {
    1: 'Connection',
    2: 'Credential',
    3: 'Message',
    4: 'Key',
    5: 'Proof'
  };
  
  return kinds[kind] || `Type ${kind}`;
}

/**
 * Format date to be more readable
 */
function formatDate(date: Date): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

/**
 * Count items by category with credential type extraction
 */
export const countItemsByCategory = async () => {
  console.log('Database: Counting items by category with credential type extraction');
  
  try {
    // Try to extract more meaningful data from the items
    const query = `
      WITH item_data AS (
        SELECT 
          encode(category, 'hex') as category_hex,
          encode(name, 'escape') as name_text,
          encode(value, 'escape') as value_text,
          kind,
          id
        FROM 
          postgres.items
      )
      SELECT 
        category_hex,
        name_text,
        COUNT(*) as count,
        kind,
        array_agg(id) as item_ids
      FROM 
        item_data
      GROUP BY 
        category_hex, name_text, kind
      ORDER BY 
        count DESC, category_hex
    `;
    
    const result = await pool.query(query);
    console.log('Database: Found', result.rows.length, 'different categories with names');
    
    // Format the results with readable kind values and extract credential types
    const formattedResults = result.rows.map(row => {
      // Try to extract credential type from name_text or format the hexadecimal category
      let credentialType = 'Unknown';
      
      // First check if name_text contains useful information
      if (row.name_text && row.name_text.length > 0) {
        try {
          // Remove non-printable characters
          const cleanedText = row.name_text.replace(/[^\x20-\x7E]/g, '');
          if (cleanedText.length > 0) {
            credentialType = cleanedText;
          }
        } catch (e) {
          console.log('Error processing name_text:', e);
        }
      }
      
      return {
        category_hex: row.category_hex,
        credential_type: credentialType,
        count: parseInt(row.count),
        kind: formatKind(row.kind),
        item_ids: row.item_ids
      };
    });
    
    return formattedResults;
  } catch (error) {
    console.error('Database: Error counting items by category:', error);
    throw error;
  }
};

/**
 * Get items by profile and kind for analysis
 */
export const getItemsByProfileAndKind = async () => {
  try {
    const query = `
      SELECT 
        p.id as profile_id,
        i.kind,
        COUNT(*) as count
      FROM 
        postgres.items i
      JOIN 
        postgres.profiles p ON i.profile_id = p.id
      GROUP BY 
        p.id, i.kind
      ORDER BY 
        p.id, i.kind
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Database: Error analyzing items by profile and kind:', error);
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
    // Use postgres schema
    const result = await pool.query('SELECT * FROM postgres.items WHERE id = $1', [id]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error fetching item by ID: ${error}`);
    throw error;
  }
};

/**
 * Get all profiles from the postgres.profiles table
 * @returns {Promise<Array>} The array of profiles
 */
export const getAllProfiles = async () => {
  try {
    const result = await pool.query('SELECT * FROM postgres.profiles');
    return result.rows;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
};

/**
 * Get all configuration from the postgres.config table
 * @returns {Promise<Array>} The array of config entries
 */
export const getConfiguration = async () => {
  try {
    const result = await pool.query('SELECT * FROM postgres.config');
    return result.rows;
  } catch (error) {
    console.error('Error fetching configuration:', error);
    throw error;
  }
};

/**
 * Get data from a specific table in the postgres schema
 * @param {string} tableName The name of the table without schema prefix
 * @param {number} limit Maximum number of rows to return
 * @returns {Promise<Array>} The array of rows
 */
export const getTableData = async (tableName: string, limit: number = 20) => {
  try {
    // Adding postgres schema and safely parameterizing the limit
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, ''); // Basic SQL injection protection
    const query = `SELECT * FROM postgres.${safeTableName} LIMIT $1`;
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error(`Error fetching data from table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Get all database tables
 * @returns {Promise<Array>} List of tables in the database
 */
export const getTables = async () => {
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    return result.rows.map(row => row.tablename);
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
};

/**
 * Get schema for a specific table
 * @param {string} tableName The name of the table
 * @returns {Promise<Array>} Column information for the table
 */
export const getTableSchema = async (tableName) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(`Error fetching schema for table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Get all wallet items - main method used by the API
 */
export const getAllItemsFromPublicSchema = async () => {
  console.log('Database: Fetching wallet database information');
  
  try {
    // Get list of tables
    const tables = await getTables();
    console.log('Database: Found tables:', tables);
    
    // If we have no tables, return sample data
    if (tables.length === 0) {
      return [
        { id: 1, name: 'Sample Item 1', description: 'This is a sample item' },
        { id: 2, name: 'Sample Item 2', description: 'Another sample item' }
      ];
    }
    
    // Return information about the database
    const databaseInfo = {
      database: dbConfig.database,
      tables: tables,
      tableDetails: []
    };
    
    // Get schema and sample data for a few important tables (limit to 3 to avoid too much data)
    const importantTables = tables.slice(0, 3);
    for (const tableName of importantTables) {
      const schema = await getTableSchema(tableName);
      const sampleData = await getTableData(tableName, 5); // Limit to 5 rows per table
      
      databaseInfo.tableDetails.push({
        name: tableName,
        schema: schema,
        sampleData: sampleData,
        rowCount: sampleData.length
      });
    }
    
    return databaseInfo;
  } catch (error) {
    console.error('Database: Error fetching database info:', error);
    return [
      { error: 'Error fetching database info', details: error.message },
      { id: 1, name: 'Sample Item 1', description: 'This is a sample item' }
    ];
  }
};

/**
 * Count items grouped by kind (for summary)
 */
export const countItemsByKind = async () => {
  console.log('Database: Counting items by kind (type)');
  
  try {
    const query = `
      SELECT 
        kind,
        COUNT(*) as count
      FROM 
        postgres.items 
      GROUP BY 
        kind 
      ORDER BY 
        kind
    `;
    
    const result = await pool.query(query);
    console.log('Database: Found counts for', result.rows.length, 'different kinds');
    
    // Format the results with readable kind values
    const formattedResults = result.rows.map(row => ({
      kind: formatKind(row.kind),
      kind_id: row.kind,
      count: parseInt(row.count)
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Database: Error counting items by kind:', error);
    throw error;
  }
};

// Add error handling for the database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
}); 