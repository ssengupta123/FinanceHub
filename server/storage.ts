import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  projects,
  sheets,
  screens,
  rules,
  type Project,
  type InsertProject,
  type Sheet,
  type InsertSheet,
  type Screen,
  type InsertScreen,
  type Rule,
  type InsertRule,
} from "@shared/schema";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  getSheetsByProject(projectId: string): Promise<Sheet[]>;
  getSheet(id: string): Promise<Sheet | undefined>;
  createSheet(data: InsertSheet): Promise<Sheet>;
  deleteSheet(id: string): Promise<void>;

  getScreensByProject(projectId: string): Promise<Screen[]>;
  getScreen(id: string): Promise<Screen | undefined>;
  createScreen(data: InsertScreen): Promise<Screen>;
  deleteScreen(id: string): Promise<void>;

  getRulesBySheet(sheetId: string): Promise<Rule[]>;
  getRulesByProject(projectId: string): Promise<Rule[]>;
  getRule(id: string): Promise<Rule | undefined>;
  createRule(data: InsertRule): Promise<Rule>;
  updateRule(id: string, data: Partial<InsertRule>): Promise<Rule | undefined>;
  deleteRule(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(projects.createdAt);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async createProject(data: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(data).returning();
    return result[0];
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getSheetsByProject(projectId: string): Promise<Sheet[]> {
    return db.select().from(sheets).where(eq(sheets.projectId, projectId));
  }

  async getSheet(id: string): Promise<Sheet | undefined> {
    const result = await db.select().from(sheets).where(eq(sheets.id, id));
    return result[0];
  }

  async createSheet(data: InsertSheet): Promise<Sheet> {
    const result = await db.insert(sheets).values(data).returning();
    return result[0];
  }

  async deleteSheet(id: string): Promise<void> {
    await db.delete(sheets).where(eq(sheets.id, id));
  }

  async getScreensByProject(projectId: string): Promise<Screen[]> {
    return db.select().from(screens).where(eq(screens.projectId, projectId));
  }

  async getScreen(id: string): Promise<Screen | undefined> {
    const result = await db.select().from(screens).where(eq(screens.id, id));
    return result[0];
  }

  async createScreen(data: InsertScreen): Promise<Screen> {
    const result = await db.insert(screens).values(data).returning();
    return result[0];
  }

  async deleteScreen(id: string): Promise<void> {
    await db.delete(screens).where(eq(screens.id, id));
  }

  async getRulesBySheet(sheetId: string): Promise<Rule[]> {
    return db.select().from(rules).where(eq(rules.sheetId, sheetId));
  }

  async getRulesByProject(projectId: string): Promise<Rule[]> {
    const projectSheets = await this.getSheetsByProject(projectId);
    const sheetIds = projectSheets.map((s) => s.id);
    if (sheetIds.length === 0) return [];
    const allRules: Rule[] = [];
    for (const sid of sheetIds) {
      const sheetRules = await db.select().from(rules).where(eq(rules.sheetId, sid));
      allRules.push(...sheetRules);
    }
    return allRules;
  }

  async getRule(id: string): Promise<Rule | undefined> {
    const result = await db.select().from(rules).where(eq(rules.id, id));
    return result[0];
  }

  async createRule(data: InsertRule): Promise<Rule> {
    const result = await db.insert(rules).values(data).returning();
    return result[0];
  }

  async updateRule(id: string, data: Partial<InsertRule>): Promise<Rule | undefined> {
    const result = await db.update(rules).set(data).where(eq(rules.id, id)).returning();
    return result[0];
  }

  async deleteRule(id: string): Promise<void> {
    await db.delete(rules).where(eq(rules.id, id));
  }
}

export const storage = new DatabaseStorage();
