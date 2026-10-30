import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Prompt, 
  Category, 
  GuidedBuilderState, 
  PromptVersion,
  OutputType,
  AIModel,
  ToneStyle
} from '@/types/prompt';
import { isEnglishNow } from '@/i18n/lang';
import { remote, newId } from '@/data/libraryDb';

interface PromptStore {
  // Prompts
  prompts: Prompt[];
  activePromptId: string | null;
  /** Signed-in user whose library is synced to the DB; null = local-only (signed out). */
  syncUserId: string | null;
  libraryStatus: 'local' | 'loading' | 'ready' | 'error';
  setLibrary: (prompts: Prompt[], syncUserId: string | null, status: PromptStore['libraryStatus']) => void;
  
  // Guided Builder
  builderState: GuidedBuilderState;
  
  // User preferences
  userProfile: 'beginner' | 'content-creator' | 'developer' | 'designer' | 'business';
  darkMode: boolean;
  
  // Actions - Prompts
  addPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'versions'>) => string;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  duplicatePrompt: (id: string) => string;
  toggleFavorite: (id: string) => void;
  setActivePrompt: (id: string | null) => void;
  
  // Actions - Versions
  addVersion: (promptId: string, content: string, label?: string) => void;
  revertToVersion: (promptId: string, versionId: string) => void;
  
  // Actions - Builder
  updateBuilderState: (updates: Partial<GuidedBuilderState>) => void;
  resetBuilderState: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  
  // Actions - Preferences
  setUserProfile: (profile: PromptStore['userProfile']) => void;
  toggleDarkMode: () => void;
  
  // Getters
  getPromptsByCategory: (category: Category) => Prompt[];
  getFavorites: () => Prompt[];
  searchPrompts: (query: string) => Prompt[];
  getPromptById: (id: string) => Prompt | undefined;
}

const initialBuilderState: GuidedBuilderState = {
  step: 0,
  objective: '',
  outputType: null,
  targetModel: 'generic',
  tone: null,
  targetAudience: '',
  constraints: [],
  format: '',
  language: 'pt',
  creativityLevel: 50,
  additionalContext: '',
};

const generateId = () => newId();
const synced = (get: () => PromptStore) => !!get().syncUserId;

export const usePromptStore = create<PromptStore>()(
  persist(
    (set, get) => ({
      prompts: [],
      activePromptId: null,
      syncUserId: null,
      libraryStatus: 'local',
      setLibrary: (prompts, syncUserId, libraryStatus) => set({ prompts, syncUserId, libraryStatus }),
      builderState: initialBuilderState,
      userProfile: 'beginner',
      // No stored choice yet: follow the system setting (dark when unknown).
      darkMode: typeof window === 'undefined' || !window.matchMedia ? true : !window.matchMedia('(prefers-color-scheme: light)').matches,

      // Prompt actions
      addPrompt: (promptData) => {
        const id = generateId();
        const now = new Date();
        const newPrompt: Prompt = {
          ...promptData,
          id,
          createdAt: now,
          updatedAt: now,
          versions: [{
            id: generateId(),
            promptId: id,
            content: promptData.content,
            createdAt: now,
            label: isEnglishNow() ? 'Initial version' : 'Versão inicial',
          }],
        };
        set((state) => ({ prompts: [...state.prompts, newPrompt] }));
        if (synced(get)) { remote.upsertPrompt(newPrompt); remote.insertVersions(newPrompt.versions); }
        return id;
      },

      updatePrompt: (id, updates) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date() }
              : p
          ),
        }));
        const up = get().prompts.find((p) => p.id === id);
        if (up && synced(get)) remote.upsertPrompt(up);
      },

      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
          activePromptId: state.activePromptId === id ? null : state.activePromptId,
        }));
        if (synced(get)) remote.deletePrompt(id);
      },

      duplicatePrompt: (id) => {
        const prompt = get().prompts.find((p) => p.id === id);
        if (!prompt) return '';
        
        const newId = generateId();
        const now = new Date();
        const duplicated: Prompt = {
          ...prompt,
          id: newId,
          title: `${prompt.title} ${isEnglishNow() ? '(copy)' : '(cópia)'}`,
          createdAt: now,
          updatedAt: now,
          versions: [{
            id: generateId(),
            promptId: newId,
            content: prompt.content,
            createdAt: now,
            label: isEnglishNow() ? 'Initial version (duplicated)' : 'Versão inicial (duplicada)',
          }],
        };
        set((state) => ({ prompts: [...state.prompts, duplicated] }));
        if (synced(get)) { remote.upsertPrompt(duplicated); remote.insertVersions(duplicated.versions); }
        return newId;
      },

      toggleFavorite: (id) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
          ),
        }));
        const fp = get().prompts.find((p) => p.id === id);
        if (fp && synced(get)) remote.upsertPrompt(fp);
      },

      setActivePrompt: (id) => {
        set({ activePromptId: id });
      },

      // Version actions
      addVersion: (promptId, content, label) => {
        const version: PromptVersion = {
          id: generateId(),
          promptId,
          content,
          createdAt: new Date(),
          label,
        };
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === promptId
              ? {
                  ...p,
                  versions: [...p.versions, version],
                  currentVersionId: version.id,
                  content,
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        const vp = get().prompts.find((p) => p.id === promptId);
        if (vp && synced(get)) { remote.insertVersions([version]); remote.upsertPrompt(vp); }
      },

      revertToVersion: (promptId, versionId) => {
        const prompt = get().prompts.find((p) => p.id === promptId);
        const version = prompt?.versions.find((v) => v.id === versionId);
        if (!version) return;

        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === promptId
              ? {
                  ...p,
                  content: version.content,
                  currentVersionId: versionId,
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        const rp = get().prompts.find((p) => p.id === promptId);
        if (rp && synced(get)) remote.upsertPrompt(rp);
      },

      // Builder actions
      updateBuilderState: (updates) => {
        set((state) => ({
          builderState: { ...state.builderState, ...updates },
        }));
      },

      resetBuilderState: () => {
        set({ builderState: initialBuilderState });
      },

      nextStep: () => {
        set((state) => ({
          builderState: {
            ...state.builderState,
            step: Math.min(state.builderState.step + 1, 7),
          },
        }));
      },

      prevStep: () => {
        set((state) => ({
          builderState: {
            ...state.builderState,
            step: Math.max(state.builderState.step - 1, 0),
          },
        }));
      },

      goToStep: (step) => {
        set((state) => ({
          builderState: { ...state.builderState, step },
        }));
      },

      // Preference actions
      setUserProfile: (profile) => {
        set({ userProfile: profile });
      },

      toggleDarkMode: () => {
        set((state) => ({ darkMode: !state.darkMode }));
      },

      // Getters
      getPromptsByCategory: (category) => {
        return get().prompts.filter((p) => p.category === category);
      },

      getFavorites: () => {
        return get().prompts.filter((p) => p.isFavorite);
      },

      searchPrompts: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().prompts.filter(
          (p) =>
            p.title.toLowerCase().includes(lowerQuery) ||
            p.content.toLowerCase().includes(lowerQuery) ||
            p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      },

      getPromptById: (id) => {
        return get().prompts.find((p) => p.id === id);
      },
    }),
    {
      name: 'promptforge-storage',
      // Signed-in libraries live in the DB; only signed-out (local) prompts are kept in localStorage.
      partialize: (state) => ({
        ...(state.syncUserId ? {} : { prompts: state.prompts }),
        userProfile: state.userProfile,
        darkMode: state.darkMode,
      }),
    }
  )
);
