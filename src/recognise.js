/** Form only: what shape is this data in, and what are its parts. */

export function recognise({ type, data }) {
  if (type !== "text") return { type, parts: [] };
  return { type, parts: String(data).toLowerCase().match(/[a-z']+/g) ?? [] };
}
