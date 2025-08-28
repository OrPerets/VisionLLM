// Backend API types matching Pydantic models
export interface ProjectRead {
  id: number;
  name: string;
  system_instructions?: string | null;
  defaults?: Record<string, any> | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationRead {
  id: number;
  project_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRead {
  id: number;
  conversation_id: number;
  role: "system" | "user" | "assistant";
  content: string;
  meta_json?: Record<string, any> | null;
  created_at: string;
}

export interface UserRead {
  id: number;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at: string;
}

export interface ProjectMemberRead {
  id: number;
  project_id: number;
  user_id: number;
  role_in_project: string;
  created_at: string;
}

export interface Meta {
  backend_version: string;
  model_server_ok: boolean;
  model_id: string;
}

export interface Health {
  ok: boolean;
}

export interface ActivityLog {
  id: number;
  actor_id?: number | null;
  action: string;
  object_type: string;
  object_id: number;
  project_id?: number | null;
  created_at: string;
}

export interface SearchResponse {
  projects: ProjectRead[];
  conversations: ConversationRead[];
}

export interface StreamingMeta {
  elapsed_sec?: number;
  tokens_per_sec?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  backend: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
}

// Request types
export interface CreateProjectRequest {
  name: string;
  system_instructions?: string;
  defaults?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  system_instructions?: string;
  defaults?: Record<string, any>;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface UpdateConversationRequest {
  title?: string;
}

export interface ChatStreamRequest {
  project_id: number;
  conversation_id: number;
  user_text: string;
  stream: true;
  temperature?: number;
  max_tokens?: number;
  system_override?: string;
  history_strategy?: "recent" | "window";
}

export interface SQLTranspileRequest {
  sql: string;
  source: string;
  target: string;
}

export interface SQLLintRequest {
  sql: string;
  dialect: string;
}

export interface SQLTranspileResponse {
  result: string;
}

export interface SQLLintResponse {
  report: string;
  fixed: string;
}

// UI state types
export interface AppState {
  selectedProjectId: number | null;
  selectedConversationId: number | null;
  projects: ProjectRead[];
  conversationsByProject: Record<number, ConversationRead[]>;
  messagesByConversation: Record<number, MessageRead[]>;
  isLoading: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  rightSidebarWidth: number;
  theme: "light" | "dark" | "system";
}

// Streaming event types
export interface StreamDelta {
  text: string;
}

export interface StreamDone {
  message_id: number;
  meta: StreamingMeta;
}

export interface StreamCallbacks {
  onDelta: (delta: StreamDelta) => void;
  onDone: (data: StreamDone) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

// Error types
export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

// SQL dialects for tools
export const SQL_DIALECTS = [
  "snowflake",
  "bigquery", 
  "postgres",
  "mysql",
  "duckdb",
  "sqlite",
  "redshift",
  "oracle",
  "mssql",
] as const;

export type SQLDialect = typeof SQL_DIALECTS[number];

// Admin/member requests
export interface ProjectMemberCreateRequest {
  email: string;
  role_in_project?: string;
}

export interface ProjectMemberUpdateRequest {
  role_in_project: string;
}
