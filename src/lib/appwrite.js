import { Client, Account, TablesDB, Storage } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) 
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// 1. Account Service (You already have this)
export const account = new Account(client);

// 2. TablesDB Service (The new way to handle your "Tables" and "Rows")
export const tables = new TablesDB(client);

// 3. Storage Service (To upload the actual image files)
export const storage = new Storage(client);

export { client, ID, Query } from 'appwrite';
