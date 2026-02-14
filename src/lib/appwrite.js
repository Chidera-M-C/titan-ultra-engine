import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const storage = new Storage(client);

// USE THIS: 'Databases' is exported in all versions. 
// It works perfectly with the new "Tables" UI.
export const db = new Databases(client); 

export { client, ID, Query } from 'appwrite';
