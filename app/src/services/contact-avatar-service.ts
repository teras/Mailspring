import crypto from 'crypto';
import DatabaseStore from '../flux/stores/database-store';
import { Contact } from '../flux/models/contact';

// Cache for avatar lookups
const avatarCache: Record<string, string | null> = {};
const gravatarCache: Record<string, boolean> = {};

export interface AvatarResult {
  url: string | null;
  type: 'carddav' | 'google' | 'gravatar' | 'initials' | null;
}

/**
 * Clear the avatar cache - call this when contacts are synced
 */
export function clearAvatarCache() {
  Object.keys(avatarCache).forEach(key => delete avatarCache[key]);
}

/**
 * Get avatar URL for an email address.
 * Checks in order: CardDAV photo, Google photo, Gravatar
 * Returns null if no photo found (caller should show initials)
 */
export async function getAvatarForEmail(email: string): Promise<AvatarResult> {
  if (!email) return { url: null, type: null };

  const normalizedEmail = email.toLowerCase().trim();

  // Check cache first
  if (normalizedEmail in avatarCache) {
    const cached = avatarCache[normalizedEmail];
    if (cached) {
      return { url: cached, type: cached.startsWith('data:') ? 'carddav' : 'carddav' };
    }
    // Fall through to check gravatar if no cached photo
  }

  // Look up contact in database
  try {
    const dbContacts = await DatabaseStore.findAll<Contact>(Contact)
      .where({ email: normalizedEmail })
      .then();

    for (const dbContact of dbContacts) {
      if (dbContact?.info) {
        const info = dbContact.info as any;

        // CardDAV contact with photo
        if (info.photo) {
          let url: string;
          if (info.photo.startsWith('http')) {
            url = info.photo;
          } else {
            url = `data:image/jpeg;base64,${info.photo}`;
          }
          avatarCache[normalizedEmail] = url;
          return { url, type: 'carddav' };
        }

        // Google contact with photo
        if (info.photos?.length > 0 && info.photos[0].url) {
          const url = info.photos[0].url;
          avatarCache[normalizedEmail] = url;
          return { url, type: 'google' };
        }
      }
    }
  } catch (err) {
    console.warn('Error looking up contact photo:', err);
  }

  // No photo found in contacts, cache as null
  avatarCache[normalizedEmail] = null;
  return { url: null, type: null };
}

/**
 * Check if a Gravatar exists for an email (async with caching)
 */
export function checkGravatar(email: string): Promise<string | null> {
  return new Promise(resolve => {
    if (!email) {
      resolve(null);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex');

    // Check cache
    if (hash in gravatarCache) {
      if (gravatarCache[hash]) {
        resolve(`https://www.gravatar.com/avatar/${hash}?s=88`);
      } else {
        resolve(null);
      }
      return;
    }

    // Load gravatar image to check if it exists
    const img = new Image();
    img.onload = () => {
      gravatarCache[hash] = true;
      resolve(`https://www.gravatar.com/avatar/${hash}?s=88`);
    };
    img.onerror = () => {
      gravatarCache[hash] = false;
      resolve(null);
    };
    img.src = `https://www.gravatar.com/avatar/${hash}?s=88&d=404`;
  });
}

/**
 * Get the best available avatar for an email.
 * Tries: CardDAV/Google photo, then Gravatar
 */
export async function getBestAvatar(email: string): Promise<AvatarResult> {
  // First check for stored photos (CardDAV, Google)
  const storedAvatar = await getAvatarForEmail(email);
  if (storedAvatar.url) {
    return storedAvatar;
  }

  // Fall back to Gravatar
  const gravatarUrl = await checkGravatar(email);
  if (gravatarUrl) {
    return { url: gravatarUrl, type: 'gravatar' };
  }

  return { url: null, type: null };
}
