import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  consentVersion: text("consent_version").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("leads_email_created_idx").on(table.email, table.createdAt)]);
