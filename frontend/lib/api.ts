import { 
  ProjectRead,
  ConversationRead,
  MessageRead,
  Meta,
  Health,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateConversationRequest,
  UpdateConversationRequest,
  SQLTranspileRequest,
  SQLLintRequest,
  SQLTranspileResponse,
  SQLLintResponse,
  APIError,
  ActivityLog,
  SearchResponse,
  UserRead,
  ProjectMemberRead,
  ProjectMemberCreateRequest,
  ProjectMemberUpdateRequest,
  ModelsResponse,
  LLMProviderRead,
  LLMProviderCreate,
  LLMProviderUpdate,
  Agent,
  AgentRecommendRequest,
  AgentRecommendation,
  AgentCreate,
  AgentUpdate,
} from "./types";

// Get API base with fallback for Railway deployment
function getApiBase(): string {
  // First try environment variable
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  
  // Fallback: construct from current URL for Railway
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    
    // Local development: use localhost:8000 for backend
    if (currentOrigin.includes('localhost:3000')) {
      return 'http://localhost:8000/api';
    }
    
    // Railway deployment: Replace frontend service name with backend service name
    const backendOrigin = currentOrigin.replace('vision-llm-frontend', 'discerning-wonder');
    return `${backendOrigin}/api`;
  }
  
  return '';
}

const API_BASE = getApiBase();
console.log("API_BASE:", API_BASE, "NEXT_PUBLIC_API_BASE:", process.env.NEXT_PUBLIC_API_BASE, "Current origin:", typeof window !== 'undefined' ? window.location.origin : 'server');

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
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

// Models admin
export async function getModels(): Promise<ModelsResponse> {
  // Use public models endpoint so chat UI can access even if not admin
  return fetchJson<ModelsResponse>(`${API_BASE}/models`);
}

export async function pullModel(name: string): Promise<{ ok: boolean; status: string; name?: string }> {
  return fetchJson<{ ok: boolean; status: string; name?: string }>(`${API_BASE}/admin/models/pull`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteModel(name: string): Promise<{ ok: boolean }> {
  return fetchJson<{ ok: boolean }>(`${API_BASE}/admin/models/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// LLM Providers (admin)
export async function listLLMProviders(): Promise<LLMProviderRead[]> {
  return fetchJson<LLMProviderRead[]>(`${API_BASE}/admin/llm/providers`);
}

export async function createLLMProvider(data: LLMProviderCreate): Promise<LLMProviderRead> {
  return fetchJson<LLMProviderRead>(`${API_BASE}/admin/llm/providers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLLMProvider(id: number, data: LLMProviderUpdate): Promise<LLMProviderRead> {
  return fetchJson<LLMProviderRead>(`${API_BASE}/admin/llm/providers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteLLMProvider(id: number): Promise<{ ok: boolean }> {
  return fetchJson<{ ok: boolean }>(`${API_BASE}/admin/llm/providers/${id}`, {
    method: "DELETE",
  });
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

// Project members
export async function getProjectMembers(projectId: number): Promise<ProjectMemberRead[]> {
  return fetchJson<ProjectMemberRead[]>(`${API_BASE}/projects/${projectId}/members`);
}

export async function addProjectMember(projectId: number, data: ProjectMemberCreateRequest): Promise<ProjectMemberRead> {
  return fetchJson<ProjectMemberRead>(`${API_BASE}/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProjectMember(projectId: number, userId: number, data: ProjectMemberUpdateRequest): Promise<ProjectMemberRead> {
  return fetchJson<ProjectMemberRead>(`${API_BASE}/projects/${projectId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function removeProjectMember(projectId: number, userId: number): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`${API_BASE}/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

// Conversation endpoints
export async function getConversations(projectId: number, q?: string): Promise<ConversationRead[]> {
  const url = new URL(`${API_BASE}/projects/${projectId}/conversations`);
  if (q && q.trim()) url.searchParams.set("q", q);
  return fetchJson<ConversationRead[]>(url.toString());
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
  return fetchJson<ConversationRead>(`${API_BASE}/projects/conversations/${conversationId}`);
}

export async function deleteConversation(conversationId: number): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`${API_BASE}/projects/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export async function updateConversation(
  conversationId: number,
  data: UpdateConversationRequest
): Promise<ConversationRead> {
  return fetchJson<ConversationRead>(`${API_BASE}/projects/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
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

// Exports
export async function exportConversationJSON(conversationId: number): Promise<any> {
  return fetchJson<any>(`${API_BASE}/projects/conversations/${conversationId}/export.json`);
}

export async function exportConversationMarkdown(conversationId: number): Promise<string> {
  const response = await fetch(`${API_BASE}/projects/conversations/${conversationId}/export.md`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) throw new APIError(response.status, response.statusText, "Export failed");
  return await response.text();
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

// Admin endpoints
export async function getRecentActivity(limit = 50): Promise<ActivityLog[]> {
  return fetchJson<ActivityLog[]>(`${API_BASE}/admin/activity?limit=${limit}`);
}

export async function searchAll(q: string): Promise<SearchResponse> {
  const url = new URL(`${API_BASE}/projects/search`);
  url.searchParams.set("q", q);
  return fetchJson<SearchResponse>(url.toString());
}

// Agents (public)
export async function listAgents(params: { q?: string; product?: string; category?: string; tag?: string; limit?: number } = {}): Promise<Agent[]> {
  const url = new URL(`${API_BASE}/agents`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.product) url.searchParams.set("product", params.product);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.tag) url.searchParams.set("tag", params.tag);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  return fetchJson<Agent[]>(url.toString());
}

export async function getAgent(agentId: number): Promise<Agent> {
  return fetchJson<Agent>(`${API_BASE}/agents/${agentId}`);
}

export async function recommendAgents(data: AgentRecommendRequest): Promise<AgentRecommendation[]> {
  return fetchJson<AgentRecommendation[]>(`${API_BASE}/agents/recommend`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Admin: Agents
export async function adminListAgents(q?: string): Promise<Agent[]> {
  const url = new URL(`${API_BASE}/admin/agents`);
  if (q) url.searchParams.set("q", q);
  return fetchJson<Agent[]>(url.toString());
}

export async function adminCreateAgent(data: AgentCreate): Promise<Agent> {
  return fetchJson<Agent>(`${API_BASE}/admin/agents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adminUpdateAgent(agentId: number, data: AgentUpdate): Promise<Agent> {
  return fetchJson<Agent>(`${API_BASE}/admin/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function adminDeleteAgent(agentId: number): Promise<{ ok: boolean }> {
  return fetchJson<{ ok: boolean }>(`${API_BASE}/admin/agents/${agentId}`, {
    method: "DELETE",
  });
}

export async function listUsers(q?: string): Promise<UserRead[]> {
  const url = new URL(`${API_BASE}/admin/users`);
  if (q) url.searchParams.set("q", q);
  return fetchJson<UserRead[]>(url.toString());
}

export async function updateUserRole(userId: number, role: string): Promise<UserRead> {
  return fetchJson<UserRead>(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function adminCleanupDB(scope: "chat" | "all" | "demo"): Promise<{ ok: true; counts?: Record<string, number> }> {
  return fetchJson<{ ok: true; counts?: Record<string, number> }>(`${API_BASE}/admin/maintenance/cleanup`, {
    method: "POST",
    body: JSON.stringify({ scope }),
  });
}

// Auth endpoints
export async function getCurrentUser(): Promise<{ user: UserRead | null }> {
  return fetchJson<{ user: UserRead | null }>(`${API_BASE}/auth/me`);
}

export async function login(email: string, password: string): Promise<{ user: UserRead; token?: string }> {
  return fetchJson<{ user: UserRead; token?: string }>(`${API_BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`${API_BASE}/auth/logout`, {
    method: "POST",
  });
}

export async function refreshAuth(): Promise<{ user: UserRead | null }> {
  try {
    return await getCurrentUser();
  } catch (error) {
    return { user: null };
  }
}

// Google OAuth redirect (for existing flow)
export function redirectToGoogleLogin(): void {
  console.log("Redirecting to Google login with API_BASE:", API_BASE);
  window.location.href = `${API_BASE}/auth/login/google`;
}
