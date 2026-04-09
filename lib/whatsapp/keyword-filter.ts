/**
 * Returns true if a message looks like a worker availability update.
 * Must match keywords from at least 2 categories to reduce false positives.
 */

const CATEGORIES = [
  // Availability
  /\b(available|availability|avail|not available|unavailable|busy)\b/i,
  // Days of week
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend)\b/i,
  // Shift type
  /\b(day shift|night shift|afternoon|morning)\b/i,
  // Time commitment
  /\b(full.?time|part.?time)\b/i,
  // Self-intro patterns
  /\b(my name is|i am|i can work|i'm available|im available)\b/i,
]

export function isAvailabilityMessage(text: string): boolean {
  const matches = CATEGORIES.filter((pattern) => pattern.test(text))
  return matches.length >= 2
}
