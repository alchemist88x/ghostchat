export interface AnonymousIdentity {
  name: string;
  emoji: string;
  fullName: string;
}

const AVATAR_NAMES: { name: string; emoji: string }[] = [
  { name: "Panda", emoji: "🐼" },
  { name: "Fox", emoji: "🦊" },
  { name: "Wolf", emoji: "🐺" },
  { name: "Raven", emoji: "🦅" },
  { name: "Tiger", emoji: "🐯" },
  { name: "Moon", emoji: "🌙" },
  { name: "Cloud", emoji: "☁️" },
  { name: "Bear", emoji: "🐻" },
  { name: "Otter", emoji: "🦦" },
  { name: "Koala", emoji: "🐨" },
  { name: "Falcon", emoji: "⚡" },
  { name: "Lynx", emoji: "🐱" },
  { name: "Dolphin", emoji: "🐬" },
  { name: "Owl", emoji: "🦉" },
  { name: "Deer", emoji: "🦌" },
  { name: "Hedgehog", emoji: "🦔" },
  { name: "Chameleon", emoji: "🦎" },
  { name: "Phoenix", emoji: "🔥" },
  { name: "Star", emoji: "✨" },
  { name: "Comet", emoji: "☄️" },
];

/**
 * Generate a random anonymous identity (e.g., "🐼 Anonymous Panda")
 */
export function generateAnonymousIdentity(): AnonymousIdentity {
  const chosen = AVATAR_NAMES[Math.floor(Math.random() * AVATAR_NAMES.length)];
  return {
    name: chosen.name,
    emoji: chosen.emoji,
    fullName: `Anonymous ${chosen.name}`,
  };
}

/**
 * Extract or associate emoji with a display name.
 */
export function getAvatarForName(name: string): string {
  for (const item of AVATAR_NAMES) {
    if (name.toLowerCase().includes(item.name.toLowerCase())) {
      return item.emoji;
    }
  }
  // Default cute mask for anonymous
  return "🎭";
}
