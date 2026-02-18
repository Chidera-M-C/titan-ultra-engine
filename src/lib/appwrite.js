import { Client, Account, Databases, Storage, ID, Query, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const storage = new Storage(client);
export const db = new Databases(client);

// Add this so you can use it in your CreditsCard
export const functions = new Functions(client); 

// FIX: Export the 'client' you created above, and the helpers from the library
export { client, ID, Query };
