import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import { insertProjectSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const createScreenBody = z.object({
  sheetId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["table", "cards", "list"]).default("table"),
  config: z.record(z.any()).default({}),
});

const createRuleBody = z.object({
  name: z.string().min(1),
  column: z.string().min(1),
  type: z.enum(["validation", "highlight", "format"]),
  config: z.record(z.any()).default({}),
  active: z.boolean().default(true),
});

const updateRuleBody = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    await storage.deleteProject(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/projects/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const ext = req.file.originalname.split(".").pop()?.toLowerCase();
      if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
        return res.status(400).send("Invalid file type. Please upload .xlsx, .xls, or .csv");
      }

      const name = req.body.name || req.file.originalname.replace(/\.(xlsx|xls|csv)$/i, "");
      const description = req.body.description || null;

      const parsed = insertProjectSchema.safeParse({ name, description });
      if (!parsed.success) {
        return res.status(400).send("Invalid project data");
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

      const project = await storage.createProject(parsed.data);

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) continue;

        const columns = Object.keys(jsonData[0] as Record<string, any>);

        const sheet = await storage.createSheet({
          projectId: project.id,
          name: sheetName,
          columns,
          data: jsonData as Record<string, any>[],
        });

        await storage.createScreen({
          projectId: project.id,
          sheetId: sheet.id,
          name: `${sheetName} - Table View`,
          type: "table",
          config: { visibleColumns: columns },
        });
      }

      res.json(project);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).send(error.message || "Upload failed");
    }
  });

  app.get("/api/projects/:id/sheets", async (req, res) => {
    const projectSheets = await storage.getSheetsByProject(req.params.id);
    res.json(projectSheets);
  });

  app.get("/api/sheets/:id", async (req, res) => {
    const sheet = await storage.getSheet(req.params.id);
    if (!sheet) return res.status(404).json({ message: "Sheet not found" });
    res.json(sheet);
  });

  app.get("/api/projects/:id/screens", async (req, res) => {
    const projectScreens = await storage.getScreensByProject(req.params.id);
    res.json(projectScreens);
  });

  app.get("/api/screens/:id", async (req, res) => {
    const screen = await storage.getScreen(req.params.id);
    if (!screen) return res.status(404).json({ message: "Screen not found" });
    res.json(screen);
  });

  app.post("/api/projects/:id/screens", async (req, res) => {
    try {
      const parsed = createScreenBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const screen = await storage.createScreen({
        projectId: req.params.id,
        sheetId: parsed.data.sheetId,
        name: parsed.data.name,
        type: parsed.data.type,
        config: parsed.data.config as any,
      });
      res.json(screen);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.delete("/api/projects/:id/screens/:screenId", async (req, res) => {
    await storage.deleteScreen(req.params.screenId);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/rules", async (req, res) => {
    const projectRules = await storage.getRulesByProject(req.params.id);
    res.json(projectRules);
  });

  app.get("/api/sheets/:id/rules", async (req, res) => {
    const sheetRules = await storage.getRulesBySheet(req.params.id);
    res.json(sheetRules);
  });

  app.post("/api/sheets/:id/rules", async (req, res) => {
    try {
      const parsed = createRuleBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const rule = await storage.createRule({
        sheetId: req.params.id,
        name: parsed.data.name,
        column: parsed.data.column,
        type: parsed.data.type,
        config: parsed.data.config as any,
        active: parsed.data.active,
      });
      res.json(rule);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.patch("/api/rules/:id", async (req, res) => {
    const parsed = updateRuleBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const rule = await storage.updateRule(req.params.id, parsed.data);
    if (!rule) return res.status(404).json({ message: "Rule not found" });
    res.json(rule);
  });

  app.delete("/api/rules/:id", async (req, res) => {
    await storage.deleteRule(req.params.id);
    res.json({ success: true });
  });

  return httpServer;
}
