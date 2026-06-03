import * as fs from "fs";
import * as path from "path";

type GraphifySummary = {
  root: string;
  generatedAt: string;
  packageName: string | null;
  framework: string;
  counts: {
    filesScanned: number;
    algorithms: number;
    components: number;
    apiRoutes: number;
    tests: number;
  };
  keyFiles: string[];
  notes: string[];
  graph: {
    nodes: Array<{
      id: string;
      type: "file";
      category: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      kind: "import";
    }>;
  };
};

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

function walkFiles(root: string, dir = ""): string[] {
  const absDir = path.join(root, dir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const out: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      out.push(...walkFiles(root, path.join(dir, entry.name)));
      continue;
    }
    out.push(path.join(dir, entry.name));
  }

  return out;
}

function fileCategory(filePath: string): string {
  if (filePath.startsWith("src/algorithms/")) return "algorithm";
  if (filePath.startsWith("src/components/")) return "component";
  if (filePath.startsWith("src/app/api/")) return "api";
  if (filePath.startsWith("tests/")) return "test";
  if (filePath.startsWith("scripts/")) return "script";
  return "other";
}

function resolveImportTarget(fromFile: string, importPath: string, allFiles: Set<string>): string | null {
  if (!importPath.startsWith(".")) return null;

  const fromDir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  const basePath = path.posix.normalize(path.posix.join(fromDir, importPath));

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    `${basePath}.json`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
    `${basePath}/index.js`,
    `${basePath}/index.jsx`,
    `${basePath}/index.mjs`,
    `${basePath}/index.cjs`,
  ];

  for (const candidate of candidates) {
    if (allFiles.has(candidate)) return candidate;
  }

  return null;
}

function extractImportPaths(source: string): string[] {
  const imports = new Set<string>();
  const patterns = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /import\s*['"]([^'"]+)['"]/g,
    /export\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (match[1]) imports.add(match[1]);
    }
  }

  return Array.from(imports);
}

function detectFramework(files: string[], root: string): string {
  if (files.includes("next.config.ts") || files.includes("next.config.js")) {
    return "Next.js";
  }
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.react) return "React";
    } catch {
      return "Node.js";
    }
  }
  return "Node.js";
}

function safePackageName(root: string): string | null {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.name || null;
  } catch {
    return null;
  }
}

export function graphify(rootInput: string): GraphifySummary {
  const root = path.resolve(rootInput);
  const files = walkFiles(root);
  const filesSet = new Set(files.map((f) => f.replace(/\\/g, "/")));

  const algorithms = files.filter((f) => f.startsWith("src/algorithms/") && f.endsWith(".ts")).length;
  const components = files.filter((f) => f.startsWith("src/components/") && (f.endsWith(".tsx") || f.endsWith(".ts"))).length;
  const apiRoutes = files.filter((f) => f.startsWith("src/app/api/") && f.endsWith("route.ts")).length;
  const tests = files.filter((f) => f.startsWith("tests/") || f.includes(".test.")).length;

  const keyFiles = [
    "package.json",
    "next.config.ts",
    "src/algorithms/adaptiveCuttingStock.ts",
    "src/workers/cuttingStock.worker.ts",
  ].filter((f) => files.includes(f));

  const notes: string[] = [];
  if (algorithms > 0) notes.push("Multiple cutting-stock algorithms available under src/algorithms.");
  if (apiRoutes > 0) notes.push("API route handlers found under src/app/api.");
  if (tests > 0) notes.push("Automated test files detected.");

  const graphNodes = files
    .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f))
    .map((f) => ({
      id: f.replace(/\\/g, "/"),
      type: "file" as const,
      category: fileCategory(f.replace(/\\/g, "/")),
    }));

  const graphEdges: Array<{ from: string; to: string; kind: "import" }> = [];
  const edgeDedup = new Set<string>();

  for (const node of graphNodes) {
    const absPath = path.join(root, node.id);
    let source = "";
    try {
      source = fs.readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }

    const imports = extractImportPaths(source);
    for (const importPath of imports) {
      const target = resolveImportTarget(node.id, importPath, filesSet);
      if (!target) continue;
      const edgeKey = `${node.id}->${target}`;
      if (edgeDedup.has(edgeKey)) continue;
      edgeDedup.add(edgeKey);
      graphEdges.push({ from: node.id, to: target, kind: "import" });
    }
  }

  return {
    root,
    generatedAt: new Date().toISOString(),
    packageName: safePackageName(root),
    framework: detectFramework(files, root),
    counts: {
      filesScanned: files.length,
      algorithms,
      components,
      apiRoutes,
      tests,
    },
    keyFiles,
    notes,
    graph: {
      nodes: graphNodes,
      edges: graphEdges,
    },
  };
}

export function buildGraphifyContext(rootInput = "."): { summary: GraphifySummary; outputPath: string } {
  const summary = graphify(rootInput);
  const outputDir = path.join(summary.root, ".graphify");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "context.json");
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  return { summary, outputPath };
}

export function readGraphifyContext(rootInput = "."): GraphifySummary | null {
  const root = path.resolve(rootInput);
  const contextPath = path.join(root, ".graphify", "context.json");
  if (!fs.existsSync(contextPath)) return null;

  try {
    const raw = fs.readFileSync(contextPath, "utf-8");
    return JSON.parse(raw) as GraphifySummary;
  } catch {
    return null;
  }
}

function main() {
  const rootArg = process.argv[2] || ".";
  const { summary, outputPath } = buildGraphifyContext(rootArg);

  console.log("Graphify context created");
  console.log(`Root       : ${summary.root}`);
  console.log(`Framework  : ${summary.framework}`);
  console.log(`Scanned    : ${summary.counts.filesScanned} files`);
  console.log(`Algorithms : ${summary.counts.algorithms}`);
  console.log(`Components : ${summary.counts.components}`);
  console.log(`API Routes : ${summary.counts.apiRoutes}`);
  console.log(`Tests      : ${summary.counts.tests}`);
  console.log(`Graph      : ${summary.graph.nodes.length} nodes, ${summary.graph.edges.length} edges`);
  console.log(`Output     : ${outputPath}`);
}

if (require.main === module) {
  main();
}
