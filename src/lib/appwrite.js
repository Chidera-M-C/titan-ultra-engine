import { Client, Account, Databases, Storage, ID, Query, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('YOUR_ACTUAL_PROJECT_ID_HERE'); // PASTE YOUR PROJECT ID DIRECTLY HERE

export const account = new Account(client);
export const storage = new Storage(client);
export const db = new Databases(client);
export const functions = new Functions(client);

export { client, ID, Query };
