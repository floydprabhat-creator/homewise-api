/**
 * Where the web app loads a profile photo. The key's random part doubles as a version, so a new
 * photo gets a new URL and no stale cached image is shown. Null means "show initials".
 */
export function avatarUrl(userId: string, avatarKey: string | null): string | null {
  if (!avatarKey) return null;
  const version = avatarKey.split('/').pop()!.split('.')[0];
  return `/api/users/${userId}/avatar?v=${version}`;
}
