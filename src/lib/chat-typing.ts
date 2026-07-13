/** Ephemeral typing presence — kept on globalThis so Next.js HMR doesn't wipe it. */

type TypingEntry = { until: number };
type ConvTyping = Map<string, TypingEntry>; // senderType -> entry

const g = globalThis as typeof globalThis & {
  __rasaChatTyping?: Map<string, ConvTyping>;
};

function store(): Map<string, ConvTyping> {
  if (!g.__rasaChatTyping) g.__rasaChatTyping = new Map();
  return g.__rasaChatTyping;
}

function pruneConv(convId: string, conv: ConvTyping) {
  const now = Date.now();
  for (const [role, entry] of conv) {
    if (entry.until <= now) conv.delete(role);
  }
  if (conv.size === 0) store().delete(convId);
}

export function setTyping(conversationId: string, senderType: string, ms = 4000) {
  const s = store();
  let conv = s.get(conversationId);
  if (!conv) {
    conv = new Map();
    s.set(conversationId, conv);
  }
  conv.set(senderType, { until: Date.now() + ms });
}

export function clearTyping(conversationId: string, senderType?: string) {
  const conv = store().get(conversationId);
  if (!conv) return;
  if (senderType) {
    conv.delete(senderType);
    if (conv.size === 0) store().delete(conversationId);
  } else {
    store().delete(conversationId);
  }
}

/** Active peer typers for this conversation (excluding myRole). */
export function getPeerTyping(
  conversationId: string,
  myRole: string
): { senderType: string } | null {
  const conv = store().get(conversationId);
  if (!conv) return null;
  pruneConv(conversationId, conv);
  const still = store().get(conversationId);
  if (!still) return null;

  // Prefer human peer over bot for display
  const roles = Array.from(still.keys()).filter((r) => r !== myRole);
  if (roles.length === 0) return null;
  if (roles.includes("admin")) return { senderType: "admin" };
  if (roles.includes("user")) return { senderType: "user" };
  if (roles.includes("bot")) return { senderType: "bot" };
  return { senderType: roles[0] };
}

export function getTyping(conversationId: string): { senderType: string } | null {
  const conv = store().get(conversationId);
  if (!conv) return null;
  pruneConv(conversationId, conv);
  const still = store().get(conversationId);
  if (!still || still.size === 0) return null;
  const roles = Array.from(still.keys());
  if (roles.includes("admin")) return { senderType: "admin" };
  if (roles.includes("user")) return { senderType: "user" };
  return { senderType: roles[0] };
}
