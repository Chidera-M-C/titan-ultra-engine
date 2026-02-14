import { Client, Account } from 'appwrite';

// Initialize the SDK
const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // Your API Endpoint
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID); // Your Project ID

// Export the 'account' service so we can call login/logout/session methods
export const account = new Account(client);

// If you plan on saving images or user prompts later, you'd export 'databases' or 'storage' here too.
export { client };
