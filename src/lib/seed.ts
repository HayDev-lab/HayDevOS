/**
 * Synthetic fixture seeding was intentionally removed.
 *
 * Production and local environments must now be populated only through the
 * authenticated application APIs or the explicit role-provisioning script.
 */
export async function seedDatabase(): Promise<never> {
  throw new Error(
    "Synthetic seed data has been removed. Use the authenticated APIs or scripts/provision-role-users.mjs.",
  );
}
