/**
 * 🤖 Arsenal Store - Gerenciamento de state dos agentes
 */

import { create } from 'zustand';
import { arsenalService, ARSENAL_AGENTS, WORKFLOWS, WorkflowSession, Agent, Workflow } from '@/services/arsenalService';

interface ArsenalStore {
  // Estado
  sessions: WorkflowSession[];
  currentSession: WorkflowSession | null;
  selectedPhase: number;
  allAgents: Agent[];
  allWorkflows: Workflow[];
  suggestedAgent: Agent | null;
  weeklySchedule: Record<string, string[]>;

  // Ações
  createSession: (productName: string) => void;
  loadSession: (sessionId: string) => void;
  loadSessions: () => void;
  updateSession: (sessionId: string, updates: Partial<WorkflowSession>) => void;
  completeAgent: (agentId: string, result?: any) => void;
  nextPhase: () => void;
  previousPhase: () => void;
  addNote: (note: string) => void;
  selectPhase: (phase: number) => void;
  setSuggestedAgent: (situation: string) => void;
  exportSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
}

export const useArsenalStore = create<ArsenalStore>((set, get) => ({
  // Estado inicial
  sessions: [],
  currentSession: null,
  selectedPhase: 1,
  allAgents: ARSENAL_AGENTS,
  allWorkflows: WORKFLOWS,
  suggestedAgent: null,
  weeklySchedule: arsenalService.getWeeklySchedule(),

  // Criar nova sessão
  createSession: (productName) => {
    const session = arsenalService.createSession(productName);
    set(state => ({
      sessions: [...state.sessions, session],
      currentSession: session,
      selectedPhase: 1,
    }));
  },

  // Carregar sessão
  loadSession: (sessionId) => {
    const session = arsenalService.getSession(sessionId);
    if (session) {
      set({ currentSession: session, selectedPhase: session.currentPhase });
    }
  },

  // Carregar todas as sessões
  loadSessions: () => {
    const sessions = arsenalService.listSessions();
    set({ sessions });
  },

  // Atualizar sessão
  updateSession: (sessionId, updates) => {
    const session = arsenalService.updateSession(sessionId, updates);
    if (session) {
      set(state => ({
        sessions: state.sessions.map(s => (s.id === sessionId ? session : s)),
        currentSession: state.currentSession?.id === sessionId ? session : state.currentSession,
      }));
    }
  },

  // Marcar agente como completo
  completeAgent: (agentId, result) => {
    const state = get();
    if (!state.currentSession) return;

    arsenalService.completeAgent(state.currentSession.id, agentId, result);
    const updated = arsenalService.getSession(state.currentSession.id);
    if (updated) {
      set(current => ({
        sessions: current.sessions.map(s => (s.id === state.currentSession!.id ? updated : s)),
        currentSession: updated,
      }));
    }
  },

  // Próxima fase
  nextPhase: () => {
    const state = get();
    if (!state.currentSession) return;

    arsenalService.nextPhase(state.currentSession.id);
    const updated = arsenalService.getSession(state.currentSession.id);
    if (updated) {
      set(current => ({
        sessions: current.sessions.map(s => (s.id === state.currentSession!.id ? updated : s)),
        currentSession: updated,
        selectedPhase: updated.currentPhase,
      }));
    }
  },

  // Fase anterior
  previousPhase: () => {
    set(state => {
      if (state.selectedPhase > 1) {
        return { selectedPhase: state.selectedPhase - 1 };
      }
      return state;
    });
  },

  // Adicionar nota
  addNote: (note) => {
    const state = get();
    if (!state.currentSession) return;

    arsenalService.addNote(state.currentSession.id, note);
    const updated = arsenalService.getSession(state.currentSession.id);
    if (updated) {
      set(current => ({
        sessions: current.sessions.map(s => (s.id === state.currentSession!.id ? updated : s)),
        currentSession: updated,
      }));
    }
  },

  // Selecionar fase
  selectPhase: (phase) => {
    set({ selectedPhase: phase });
  },

  // Sugerir agente
  setSuggestedAgent: (situation) => {
    const agent = arsenalService.getSuggestedAgent(situation);
    set({ suggestedAgent: agent || null });
  },

  // Exportar sessão
  exportSession: (sessionId) => {
    const json = arsenalService.exportSession(sessionId);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json));
    element.setAttribute('download', `arsenal-${sessionId}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  },

  // Deletar sessão
  deleteSession: (sessionId) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
    }));
  },
}));
