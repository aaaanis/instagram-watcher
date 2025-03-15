/**
 * Main entry point for the application
 */

import { greet } from './utils/greeting';

// Define a simple interface
interface Person {
  firstName: string;
  lastName: string;
  age?: number;
}

// Create a person object
const person: Person = {
  firstName: 'John',
  lastName: 'Doe',
  age: 30
};

// Main function
function main() {
  console.log('TypeScript Project Started!');
  console.log(greet(person));
}

// Run the main function
main();

// Export for testing
export { main };
export type { Person }; 