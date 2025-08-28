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
  provider_ok?: boolean;
}

// Models admin
export interface ModelInfo {
  name: string;
  size_bytes?: number | null;
  parameter_size?: string | null;
  quantization?: string | null;
  format?: string | null;
  source?: string | null; // ollama | tgi | gguf | provider
  provider?: string | null; // openai | google | ...
}

export interface ModelsResponse {
  backend: string;
  models: ModelInfo[];
  default_model_id?: string | null;
  current_ollama_model?: string | null;
  providers?: string[] | null;
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
  // Phase 2 additions
  confidence_score?: number;
  low_confidence?: boolean;
  agent?: {
    id: number;
    name: string;
    product: string;
  };
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
  use_rag?: boolean;
  top_k?: number;
  low_conf_threshold?: number;
  model_id?: string;
  agent_id?: number;
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

// Agents
export interface Agent {
  id: number;
  name: string;
  product: string; // snowflake | dbt | tableau
  description?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  system_instructions: string;
  knowledge_urls?: string[] | null;
  defaults?: Record<string, any> | null;
  is_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentRecommendRequest {
  q: string;
  product?: string;
  categories?: string[];
  top_k?: number;
}

export interface AgentRecommendation {
  agent: Agent;
  score: number;
  reason: string;
}

// Admin: Agents create/update
export interface AgentCreate {
  name: string;
  product: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  system_instructions: string;
  knowledge_urls?: string[];
  defaults?: Record<string, any>;
  is_enabled?: boolean;
}

export interface AgentUpdate {
  name?: string;
  product?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  system_instructions?: string;
  knowledge_urls?: string[];
  defaults?: Record<string, any>;
  is_enabled?: boolean;
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

// LLM Providers (admin)
export interface LLMProviderRead {
  id: number;
  provider: string;
  name?: string | null;
  base_url?: string | null;
  organization?: string | null;
  project?: string | null;
  config?: Record<string, any> | null;
  enabled: boolean;
}

export interface LLMProviderCreate {
  provider: string;
  name?: string;
  api_key?: string;
  base_url?: string;
  organization?: string;
  project?: string;
  config?: Record<string, any>;
  enabled?: boolean;
}

export interface LLMProviderUpdate {
  name?: string;
  api_key?: string;
  base_url?: string;
  organization?: string;
  project?: string;
  config?: Record<string, any>;
  enabled?: boolean;
}
