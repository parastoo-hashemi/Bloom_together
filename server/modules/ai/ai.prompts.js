// server/modules/ai/ai.prompts.js
// Static task templates for the AI module.
//
// This module is static/mock only.
// No external API is called. No ANTHROPIC_API_KEY is read.
// Templates are deterministic and local — they lightly embed the session
// topic to make the output feel relevant.
//
// Spec reference: BACKEND_SPEC §10.2 (static fallback is the sole path)

/**
 * Returns exactly five study task strings personalised with the session topic.
 * Falls back to "the material" when topic is blank.
 *
 * The `note` parameter is accepted for interface compatibility but is not
 * embedded in the static templates — the mock output is topic-driven only.
 *
 * @param {string} topic — session.topic from the DB
 * @param {string} [note] — optional context from the request body (unused in mock)
 * @returns {string[]} Exactly five task strings.
 */
export function buildStaticTasks(topic, note = '') {
  const subject = (topic ?? '').trim() || 'the material'

  return [
    `Summarize ${subject} into 5 key bullet points`,
    `Create 10 flashcards from the main definitions in ${subject}`,
    `Write a 30-minute study plan for ${subject} with timed blocks`,
    `List 10 likely exam questions about ${subject} and draft short answers`,
    `Create a final review checklist before ending the ${subject} session`,
  ]
}
