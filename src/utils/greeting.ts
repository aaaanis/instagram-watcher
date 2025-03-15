/**
 * Greeting utility functions
 */

/**
 * Interface for objects that can be greeted
 */
export interface Greetable {
  firstName: string;
  lastName: string;
}

/**
 * Creates a greeting for the given person
 * @param person A person with first and last name
 * @returns A personalized greeting string
 */
export function greet(person: Greetable): string {
  return `Hello, ${person.firstName} ${person.lastName}! Welcome to TypeScript.`;
}

/**
 * Creates a time-based greeting
 * @returns A greeting based on the current time
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good morning!';
  } else if (hour < 18) {
    return 'Good afternoon!';
  } else {
    return 'Good evening!';
  }
} 