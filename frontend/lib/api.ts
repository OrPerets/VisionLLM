import {
  ProjectRead,
  ConversationRead,
  MessageRead,
  Meta,
  Health,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateConversationRequest,
  SQLTranspileRequest,
  SQLLintRequest,
  SQLTranspileResponse,
  SQLLintResponse,
  APIError,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = `Request failed: ${response.status} ${response.statusText}`;
    throw new APIError(response.status, response.statusText, message);
  }

  return (await response.json()) as T;
}

// Health and meta endpoints
export async function getHealth(): Promise<Health> {
  return fetchJson<Health>(`${API_BASE}/health`);
}

export async function getMeta(): Promise<Meta> {
  return fetchJson<Meta>(`${API_BASE}/meta`);
}

// Project endpoints
export async function getProjects(): Promise<ProjectRead[]> {
  return fetchJson<ProjectRead[]>(`${API_BASE}/projects`);
}

export async function createProject(data: CreateProjectRequest): Promise<ProjectRead> {
  return fetchJson<ProjectRead>(`${API_BASE}/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProject(projectId: number): Promise<ProjectRead> {
  return fetchJson<ProjectRead>(`${API_BASE}/projects/${projectId}`);
}

export async function updateProject(
  projectId: number,
  data: UpdateProjectRequest
): Promise<ProjectRead> {
  return fetchJson<ProjectRead>(`${API_BASE}/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(projectId: number): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`${API_BASE}/projects/${projectId}`, {
    method: "DELETE",
  });
}

// Conversation endpoints
export async function getConversations(projectId: number): Promise<ConversationRead[]> {
  return fetchJson<ConversationRead[]>(`${API_BASE}/projects/${projectId}/conversations`);
}

export async function createConversation(
  projectId: number,
  data: CreateConversationRequest = {}
): Promise<ConversationRead> {
  return fetchJson<ConversationRead>(`${API_BASE}/projects/${projectId}/conversations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getConversation(conversationId: number): Promise<ConversationRead> {
  return fetchJson<ConversationRead>(`${API_BASE}/conversations/${conversationId}`);
}

export async function deleteConversation(conversationId: number): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`${API_BASE}/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

// Message endpoints
export async function getMessages(
  conversationId: number,
  limit?: number,
  before?: string
): Promise<MessageRead[]> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());
  if (before) params.set("before", before);
  
  const url = `${API_BASE}/conversations/${conversationId}/messages${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  
  return fetchJson<MessageRead[]>(url);
}

// SQL tools endpoints
export async function sqlTranspile(data: SQLTranspileRequest): Promise<SQLTranspileResponse> {
  return fetchJson<SQLTranspileResponse>(`${API_BASE}/sql/transpile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sqlLint(data: SQLLintRequest): Promise<SQLLintResponse> {
  return fetchJson<SQLLintResponse>(`${API_BASE}/sql/lint`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Export API base for use in streaming
export { API_BASE };
