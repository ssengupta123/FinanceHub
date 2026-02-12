import { storage } from "./storage";

export async function seedDatabase() {
  const existing = await storage.getProjects();
  if (existing.length > 0) return;

  const project = await storage.createProject({
    name: "Sales Report Q4",
    description: "Quarterly sales data across all regions with performance metrics",
  });

  const salesSheet = await storage.createSheet({
    projectId: project.id,
    name: "Monthly Sales",
    columns: ["Month", "Region", "Product", "Units Sold", "Revenue", "Target", "Status"],
    data: [
      { Month: "October", Region: "North", Product: "Widget Pro", "Units Sold": 342, Revenue: 17100, Target: 15000, Status: "Above Target" },
      { Month: "October", Region: "South", Product: "Widget Pro", "Units Sold": 287, Revenue: 14350, Target: 16000, Status: "Below Target" },
      { Month: "October", Region: "East", Product: "Widget Lite", "Units Sold": 456, Revenue: 13680, Target: 12000, Status: "Above Target" },
      { Month: "October", Region: "West", Product: "Widget Lite", "Units Sold": 198, Revenue: 5940, Target: 10000, Status: "Below Target" },
      { Month: "November", Region: "North", Product: "Widget Pro", "Units Sold": 389, Revenue: 19450, Target: 16000, Status: "Above Target" },
      { Month: "November", Region: "South", Product: "Widget Pro", "Units Sold": 312, Revenue: 15600, Target: 16000, Status: "Below Target" },
      { Month: "November", Region: "East", Product: "Widget Lite", "Units Sold": 521, Revenue: 15630, Target: 14000, Status: "Above Target" },
      { Month: "November", Region: "West", Product: "Widget Lite", "Units Sold": 245, Revenue: 7350, Target: 11000, Status: "Below Target" },
      { Month: "December", Region: "North", Product: "Widget Pro", "Units Sold": 478, Revenue: 23900, Target: 18000, Status: "Above Target" },
      { Month: "December", Region: "South", Product: "Widget Pro", "Units Sold": 356, Revenue: 17800, Target: 17000, Status: "Above Target" },
      { Month: "December", Region: "East", Product: "Widget Lite", "Units Sold": 602, Revenue: 18060, Target: 15000, Status: "Above Target" },
      { Month: "December", Region: "West", Product: "Widget Lite", "Units Sold": 289, Revenue: 8670, Target: 12000, Status: "Below Target" },
    ],
  });

  const teamSheet = await storage.createSheet({
    projectId: project.id,
    name: "Sales Team",
    columns: ["Name", "Role", "Region", "Quota", "Achieved", "Rating"],
    data: [
      { Name: "Alice Chen", Role: "Senior Rep", Region: "North", Quota: 50000, Achieved: 60450, Rating: "A" },
      { Name: "Bob Martinez", Role: "Account Exec", Region: "South", Quota: 48000, Achieved: 47750, Rating: "B" },
      { Name: "Carol Johnson", Role: "Senior Rep", Region: "East", Quota: 41000, Achieved: 47370, Rating: "A" },
      { Name: "David Kim", Role: "Rep", Region: "West", Quota: 33000, Achieved: 21960, Rating: "C" },
      { Name: "Eva Patel", Role: "Account Exec", Region: "North", Quota: 45000, Achieved: 52100, Rating: "A" },
    ],
  });

  await storage.createScreen({
    projectId: project.id,
    sheetId: salesSheet.id,
    name: "Sales Overview",
    type: "table",
    config: {},
  });

  await storage.createScreen({
    projectId: project.id,
    sheetId: teamSheet.id,
    name: "Team Cards",
    type: "cards",
    config: { cardTitleColumn: "Name", cardDescriptionColumn: "Role" },
  });

  await storage.createRule({
    sheetId: salesSheet.id,
    name: "Highlight Below Target",
    column: "Status",
    type: "highlight",
    config: {
      operator: "equals",
      value: "Below Target",
      highlightColor: "#ef4444",
    },
    active: true,
  });

  await storage.createRule({
    sheetId: salesSheet.id,
    name: "High Revenue",
    column: "Revenue",
    type: "highlight",
    config: {
      operator: "greater_than",
      value: "15000",
      highlightColor: "#22c55e",
    },
    active: true,
  });

  await storage.createRule({
    sheetId: teamSheet.id,
    name: "Top Performers",
    column: "Rating",
    type: "highlight",
    config: {
      operator: "equals",
      value: "A",
      highlightColor: "#3b82f6",
    },
    active: true,
  });

  console.log("Seed data created successfully");
}
