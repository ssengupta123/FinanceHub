import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const sheets = pgTable("sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  columns: jsonb("columns").$type<string[]>().notNull(),
  data: jsonb("data").$type<Record<string, any>[]>().notNull(),
});

export const insertSheetSchema = createInsertSchema(sheets).omit({ id: true });
export type InsertSheet = z.infer<typeof insertSheetSchema>;
export type Sheet = typeof sheets.$inferSelect;

export const screens = pgTable("screens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sheetId: varchar("sheet_id").notNull().references(() => sheets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("table"),
  config: jsonb("config").$type<ScreenConfig>().notNull().default({}),
});

export interface ScreenConfig {
  visibleColumns?: string[];
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  filters?: ScreenFilter[];
  cardTitleColumn?: string;
  cardDescriptionColumn?: string;
}

export interface ScreenFilter {
  column: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "not_empty" | "is_empty";
  value?: string;
}

export const insertScreenSchema = createInsertSchema(screens).omit({ id: true });
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type Screen = typeof screens.$inferSelect;

export const rules = pgTable("rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sheetId: varchar("sheet_id").notNull().references(() => sheets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  column: text("column").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").$type<RuleConfig>().notNull().default({}),
  active: boolean("active").notNull().default(true),
});

export interface RuleConfig {
  operator?: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "regex";
  value?: string;
  minValue?: string;
  maxValue?: string;
  pattern?: string;
  highlightColor?: string;
  message?: string;
  required?: boolean;
  format?: "number" | "currency" | "percentage" | "date" | "email" | "phone";
}

export const insertRuleSchema = createInsertSchema(rules).omit({ id: true });
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rules.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
