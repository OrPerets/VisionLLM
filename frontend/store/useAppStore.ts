import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ProjectRead,
  ConversationRead,
  MessageRead,
  AppState,
  StreamDelta,
  StreamingMeta,
} from "@/lib/types";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
} from "@/lib/api";
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateConversationRequest,
} from "@/lib/types";

interface AppStore extends AppState {
  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (projectId: number) => void;
  createNewProject: (data: CreateProjectRequest) => Promise<ProjectRead>;
  updateProjectData: (projectId: number, data: UpdateProjectRequest) => Promise<void>;
  deleteProjectData: (projectId: number) => Promise<void>;
  
  loadConversations: (projectId: number) => Promise<void>;
  selectConversation: (conversationId: number) => void;
  createNewConversation: (projectId: number, data?: CreateConversationRequest) => Promise<ConversationRead>;
  deleteConversationData: (conversationId: number) => Promise<void>;
  
  loadMessages: (conversationId: number) => Promise<void>;
  addUserMessage: (conversationId: number, content: string) => MessageRead;
  addAssistantMessage: (conversationId: number, content?: string) => MessageRead;
  updateAssistantMessage: (messageId: number, content: string, meta?: StreamingMeta) => void;
  appendToAssistantMessage: (messageId: number, delta: string) => void;
  
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLoading: (loading: boolean) => void;
  
  // Computed getters
  getCurrentProject: () => ProjectRead | null;
  getCurrentConversation: () => ConversationRead | null;
  getCurrentMessages: () => MessageRead[];
  getProjectConversations: (projectId: number) => ConversationRead[];
}

let messageIdCounter = 1000000; // Start high to avoid conflicts with backend IDs

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedProjectId: null,
      selectedConversationId: null,
      projects: [],
      conversationsByProject: {},
      messagesByConversation: {},
      isLoading: false,
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      theme: "system",

      // Project actions
      loadProjects: async () => {
        set({ isLoading: true });
        try {
          const projects = await getProjects();
          set({ projects });
        } catch (error) {
          console.error("Failed to load projects:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      selectProject: (projectId) => {
        set({ selectedProjectId: projectId, selectedConversationId: null });
        get().loadConversations(projectId);
      },

      createNewProject: async (data) => {
        const project = await createProject(data);
        set((state) => ({
          projects: [...state.projects, project],
          selectedProjectId: project.id,
        }));
        return project;
      },

      updateProjectData: async (projectId, data) => {
        const updatedProject = await updateProject(projectId, data);
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? updatedProject : p
          ),
        }));
      },

      deleteProjectData: async (projectId) => {
        await deleteProject(projectId);
        set((state) => {
          const newProjects = state.projects.filter((p) => p.id !== projectId);
          const newConversationsByProject = { ...state.conversationsByProject };
          delete newConversationsByProject[projectId];
          
          return {
            projects: newProjects,
            conversationsByProject: newConversationsByProject,
            selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
            selectedConversationId: state.selectedProjectId === projectId ? null : state.selectedConversationId,
          };
        });
      },

      // Conversation actions
      loadConversations: async (projectId) => {
        try {
          const conversations = await getConversations(projectId);
          set((state) => ({
            conversationsByProject: {
              ...state.conversationsByProject,
              [projectId]: conversations,
            },
          }));
        } catch (error) {
          console.error("Failed to load conversations:", error);
        }
      },

      selectConversation: (conversationId) => {
        set({ selectedConversationId: conversationId });
        get().loadMessages(conversationId);
      },

      createNewConversation: async (projectId, data = {}) => {
        const conversation = await createConversation(projectId, data);
        set((state) => ({
          conversationsByProject: {
            ...state.conversationsByProject,
            [projectId]: [
              ...(state.conversationsByProject[projectId] || []),
              conversation,
            ],
          },
          selectedConversationId: conversation.id,
        }));
        return conversation;
      },

      deleteConversationData: async (conversationId) => {
        await deleteConversation(conversationId);
        set((state) => {
          const newConversationsByProject = { ...state.conversationsByProject };
          const newMessagesByConversation = { ...state.messagesByConversation };
          
          // Remove from conversations lists
          for (const projectId in newConversationsByProject) {
            newConversationsByProject[parseInt(projectId)] = newConversationsByProject[parseInt(projectId)].filter(
              (c) => c.id !== conversationId
            );
          }
          
          // Remove messages
          delete newMessagesByConversation[conversationId];
          
          return {
            conversationsByProject: newConversationsByProject,
            messagesByConversation: newMessagesByConversation,
            selectedConversationId: state.selectedConversationId === conversationId ? null : state.selectedConversationId,
          };
        });
      },

      // Message actions
      loadMessages: async (conversationId) => {
        try {
          const messages = await getMessages(conversationId);
          set((state) => ({
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages,
            },
          }));
        } catch (error) {
          console.error("Failed to load messages:", error);
        }
      },

      addUserMessage: (conversationId, content) => {
        const message: MessageRead = {
          id: messageIdCounter++,
          conversation_id: conversationId,
          role: "user",
          content,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: [
              ...(state.messagesByConversation[conversationId] || []),
              message,
            ],
          },
        }));
        
        return message;
      },

      addAssistantMessage: (conversationId, content = "") => {
        const message: MessageRead = {
          id: messageIdCounter++,
          conversation_id: conversationId,
          role: "assistant",
          content,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: [
              ...(state.messagesByConversation[conversationId] || []),
              message,
            ],
          },
        }));
        
        return message;
      },

      updateAssistantMessage: (messageId, content, meta) => {
        set((state) => {
          const newMessagesByConversation = { ...state.messagesByConversation };
          
          for (const conversationId in newMessagesByConversation) {
            const messages = newMessagesByConversation[parseInt(conversationId)];
            const messageIndex = messages.findIndex((m) => m.id === messageId);
            
            if (messageIndex !== -1) {
              const updatedMessage = {
                ...messages[messageIndex],
                content,
                meta_json: meta || messages[messageIndex].meta_json,
              };
              
              newMessagesByConversation[parseInt(conversationId)] = [
                ...messages.slice(0, messageIndex),
                updatedMessage,
                ...messages.slice(messageIndex + 1),
              ];
              break;
            }
          }
          
          return { messagesByConversation: newMessagesByConversation };
        });
      },

      appendToAssistantMessage: (messageId, delta) => {
        set((state) => {
          const newMessagesByConversation = { ...state.messagesByConversation };
          
          for (const conversationId in newMessagesByConversation) {
            const messages = newMessagesByConversation[parseInt(conversationId)];
            const messageIndex = messages.findIndex((m) => m.id === messageId);
            
            if (messageIndex !== -1) {
              const updatedMessage = {
                ...messages[messageIndex],
                content: messages[messageIndex].content + delta,
              };
              
              newMessagesByConversation[parseInt(conversationId)] = [
                ...messages.slice(0, messageIndex),
                updatedMessage,
                ...messages.slice(messageIndex + 1),
              ];
              break;
            }
          }
          
          return { messagesByConversation: newMessagesByConversation };
        });
      },

      // UI actions
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Computed getters
      getCurrentProject: () => {
        const { selectedProjectId, projects } = get();
        return projects.find((p) => p.id === selectedProjectId) || null;
      },

      getCurrentConversation: () => {
        const { selectedConversationId, conversationsByProject, selectedProjectId } = get();
        if (!selectedProjectId || !selectedConversationId) return null;
        
        const conversations = conversationsByProject[selectedProjectId] || [];
        return conversations.find((c) => c.id === selectedConversationId) || null;
      },

      getCurrentMessages: () => {
        const { selectedConversationId, messagesByConversation } = get();
        if (!selectedConversationId) return [];
        
        return messagesByConversation[selectedConversationId] || [];
      },

      getProjectConversations: (projectId) => {
        const { conversationsByProject } = get();
        return conversationsByProject[projectId] || [];
      },
    }),
    {
      name: "visionbi-app-storage",
      partialize: (state) => ({
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        theme: state.theme,
      }),
    }
  )
);
