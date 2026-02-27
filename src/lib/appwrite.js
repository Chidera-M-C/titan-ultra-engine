import { Client, Account, Databases, Storage, ID, Query, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1') 
    .setProject('69a1905a001157741255'); // PASTE YOUR PROJECT ID DIRECTLY HERE

export const account = new Account(client);
export const storage = new Storage(client);
export const db = new Databases(client);
export const functions = new Functions(client);

export { client, ID, Query };
