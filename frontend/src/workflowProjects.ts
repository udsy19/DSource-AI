// Client-side workflow-project store (localStorage). The backend `Project` model is the pricing/BOM
// entity, not a qbiq-style test-fit project — so until a workflow-project table exists (roadmap
// Phase A backend), a "project" (property + space + program + generated designs + status) lives here.
// One concept, one file; swap the impl for an API later without touching callers.

export type ProjectStatus = "draft" | "processing" | "ready";

export interface WorkflowProject {
  id: string;
  name: string;
  address: string;
  floor: string;
  status: ProjectStatus;
  createdAt: number; // epoch ms
  updatedAt: number;
}

const KEY = "dsource.projects.v1";

function read(): WorkflowProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkflowProject[]) : [];
  } catch {
    return [];
  }
}

function write(projects: WorkflowProject[]): void {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function listProjects(): WorkflowProject[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createProject(input: { name: string; address: string; floor: string }): WorkflowProject {
  const now = Date.now();
  const project: WorkflowProject = {
    id: `p-${now.toString(36)}`,
    name: input.name.trim() || "Untitled project",
    address: input.address.trim(),
    floor: input.floor.trim(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  write([project, ...read()]);
  return project;
}

export function updateProject(id: string, patch: Partial<Omit<WorkflowProject, "id" | "createdAt">>): void {
  write(read().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
}

export function deleteProject(id: string): void {
  write(read().filter((p) => p.id !== id));
}
