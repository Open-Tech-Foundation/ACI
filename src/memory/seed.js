/**
 * The starting knowledge: enough English to hold a short exchange.
 *
 * This file is data, not logic. Everything here is something the engine could
 * equally have been taught at runtime through `memory.word(...)` and
 * `memory.respond(...)` — it is a seed, not a special case, and nothing in the
 * engine treats it differently from knowledge added later.
 */

import { Memory } from "./memory.js";

/** Concept -> the affect it carries. Drives `data.emotion` in the envelope. */
const EMOTIONS = [
  ["neutral", 0],
  ["friendly", 0.6],
  ["warm", 0.7],
  ["positive", 0.8],
  ["curious", 0.3],
  ["apologetic", -0.2],
  ["negative", -0.5],
];

/** [concept, parent, emotion] */
const CONCEPTS = [
  ["greeting", "social_act", "friendly"],
  ["farewell", "social_act", "warm"],
  ["gratitude", "social_act", "positive"],
  ["apology", "social_act", "apologetic"],
  ["affirmation", "response_act", "neutral"],
  ["negation", "response_act", "neutral"],
  ["identity_query", "query", "curious"],
  ["wellbeing_query", "query", "friendly"],
  ["help_request", "query", "curious"],
  ["unknown", null, "neutral"],
];

/** [surface, concept, aliases] — aliases share the node, they are not new words. */
const VOCABULARY = [
  ["hi", "greeting", ["hii", "hiya", "hai"]],
  ["hello", "greeting", ["helo", "hullo", "helllo"]],
  ["hey", "greeting", ["heyy", "heya"]],
  ["yo", "greeting", []],
  ["greetings", "greeting", []],
  ["good morning", "greeting", ["morning", "gm"]],
  ["good evening", "greeting", ["evening"]],
  ["good afternoon", "greeting", ["afternoon"]],

  ["bye", "farewell", ["byee", "bai"]],
  ["goodbye", "farewell", ["good bye"]],
  ["see you", "farewell", ["see ya", "cya", "seeyou"]],
  ["good night", "farewell", ["goodnight", "gn"]],
  ["farewell", "farewell", []],

  ["thanks", "gratitude", ["thnx", "thx", "thanx", "thnks"]],
  ["thank you", "gratitude", ["thankyou", "thank u", "ty"]],
  ["appreciate it", "gratitude", ["appreciated", "much appreciated"]],

  ["sorry", "apology", ["sry", "soz"]],
  ["apologies", "apology", ["apologise", "apologize", "my apologies"]],
  ["my bad", "apology", []],

  ["yes", "affirmation", ["yeah", "yep", "yup", "ya", "yeh"]],
  ["ok", "affirmation", ["okay", "okey", "kk"]],
  ["sure", "affirmation", []],
  ["correct", "affirmation", ["right", "exactly"]],

  ["no", "negation", ["nope", "nah", "naw"]],
  ["never", "negation", []],
  ["wrong", "negation", ["incorrect"]],

  ["what is your name", "identity_query", ["whats your name", "what s your name", "your name", "who are you", "what are you"]],
  ["how are you", "wellbeing_query", ["how are you doing", "hows it going", "how is it going", "how do you do", "how r u"]],
  ["help", "help_request", ["help me", "can you help", "i need help", "assist me"]],
];

/** [concept, text, options] — several per concept are allowed; heaviest wins. */
const RESPONSES = [
  ["greeting", "Hello!", { weight: 1 }],
  ["farewell", "Goodbye — talk soon.", { weight: 1, actions: [{ name: "end_session" }] }],
  ["gratitude", "You're welcome.", { weight: 1 }],
  ["apology", "No harm done.", { weight: 1 }],
  ["affirmation", "Understood.", { weight: 1 }],
  ["negation", "Understood — I'll leave it.", { weight: 1 }],
  ["identity_query", "I am ACI, a rule-based reasoning engine.", { weight: 1, type: "identity" }],
  ["wellbeing_query", "I'm running well, thank you for asking.", { weight: 1 }],
  ["help_request", "Tell me what you need and I'll work through it.", { weight: 1, actions: [{ name: "offer_help" }] }],
  ["unknown", "I don't recognise that yet — teach me and I will.", { weight: 1, type: "unknown" }],
];

/** Teaches an existing Memory the seed knowledge. */
export function seedEnglish(memory) {
  memory.language("en", "English");

  for (const [name, valence] of EMOTIONS) memory.emotion(name, { valence });
  for (const [name, parent, emotion] of CONCEPTS) {
    memory.concept(name, parent ? { parent } : {});
    if (emotion) memory.evokes(name, emotion);
  }
  for (const [surface, concept, aliases] of VOCABULARY) {
    memory.word(surface, { language: "en", concept, aliases });
  }
  for (const [concept, text, options] of RESPONSES) memory.respond(concept, text, options);

  return memory;
}

/** A Memory that already knows English. The usual starting point. */
export function createMemory(options = {}) {
  return seedEnglish(new Memory(options));
}
