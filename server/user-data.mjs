/**
 * Server-only deletion entry for a trusted platform user.uuid.
 * This prompt library stores NO member records, files, sessions, analytics,
 * shared-store records or provider AI history. Nothing is persisted to delete.
 * If persistence is added, scope every repository operation to this UUID and
 * extend this function to delete/anonymize all personal and shared references.
 * Never expose an arbitrary-UUID deletion route.
 */
export async function deleteUserData(userUuid) {
  if (typeof userUuid !== 'string' || !userUuid.trim()) {
    throw new TypeError('A trusted platform user UUID is required');
  }
  return { deletedRecords: 0, anonymizedRecords: 0, storesPersonalData: false };
}
