/**
 * 🎨 Design Store - State management com Zustand
 */

import { create } from 'zustand';
import { Design, Asset, designService, Template, TEMPLATES } from '@/services/designService';

interface DesignStore {
  // Estado
  designs: Design[];
  currentDesign: Design | null;
  templates: Template[];
  assets: Asset[];
  savedDesigns: Design[];

  // Ações de design
  createNewDesign: (name: string, type: 'post' | 'story' | 'carousel') => void;
  loadDesign: (designId: string) => void;
  saveCurrentDesign: () => Promise<void>;
  deleteDesign: (designId: string) => void;

  // Ações de asset
  addAssetToDesign: (asset: Asset) => void;
  removeAssetFromDesign: (assetId: string) => void;
  updateAssetInDesign: (assetId: string, updates: Partial<Asset>) => void;

  // Ações de template
  loadTemplates: () => void;
  createFromTemplate: (templateId: string, name: string) => Promise<void>;

  // Ações de salvamento
  loadSavedDesigns: () => Promise<void>;
  exportDesign: (designId: string) => void;
  importDesign: (json: string) => void;

  // Ações de editor
  updateDesignProperty: (property: keyof Design, value: any) => void;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  // Estado inicial
  designs: [],
  currentDesign: null,
  templates: TEMPLATES,
  assets: [],
  savedDesigns: [],

  // Criar novo design
  createNewDesign: (name, type) => {
    const design = {
      id: `design-${Date.now()}`,
      name,
      type,
      width: type === 'story' ? 1080 : type === 'carousel' ? 1080 : 1080,
      height: type === 'story' ? 1920 : type === 'carousel' ? 1350 : 1350,
      backgroundColor: '#FFFFFF',
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Design;

    set(state => ({
      designs: [...state.designs, design],
      currentDesign: design,
    }));
  },

  // Carregar design
  loadDesign: (designId) => {
    const state = get();
    const design = state.designs.find(d => d.id === designId);
    if (design) {
      set({ currentDesign: design });
    }
  },

  // Salvar design atual
  saveCurrentDesign: async () => {
    const state = get();
    if (state.currentDesign) {
      state.currentDesign.updatedAt = new Date();
      await designService.saveDesign(state.currentDesign);
      set(state => ({
        savedDesigns: [...state.savedDesigns, state.currentDesign!],
      }));
    }
  },

  // Deletar design
  deleteDesign: (designId) => {
    set(state => ({
      designs: state.designs.filter(d => d.id !== designId),
      currentDesign:
        state.currentDesign?.id === designId ? null : state.currentDesign,
    }));
  },

  // Adicionar asset
  addAssetToDesign: (asset) => {
    set(state => {
      if (!state.currentDesign) return state;

      return {
        currentDesign: {
          ...state.currentDesign,
          assets: [...state.currentDesign.assets, asset],
          updatedAt: new Date(),
        },
      };
    });
  },

  // Remover asset
  removeAssetFromDesign: (assetId) => {
    set(state => {
      if (!state.currentDesign) return state;

      return {
        currentDesign: {
          ...state.currentDesign,
          assets: state.currentDesign.assets.filter(a => a.id !== assetId),
          updatedAt: new Date(),
        },
      };
    });
  },

  // Atualizar asset
  updateAssetInDesign: (assetId, updates) => {
    set(state => {
      if (!state.currentDesign) return state;

      return {
        currentDesign: {
          ...state.currentDesign,
          assets: state.currentDesign.assets.map(a =>
            a.id === assetId ? { ...a, ...updates } : a
          ),
          updatedAt: new Date(),
        },
      };
    });
  },

  // Carregar templates
  loadTemplates: () => {
    set({ templates: designService.getTemplates() });
  },

  // Criar de template
  createFromTemplate: async (templateId, name) => {
    const design = await designService.createFromTemplate(templateId, name);
    set(state => ({
      designs: [...state.designs, design],
      currentDesign: design,
    }));
  },

  // Carregar designs salvos
  loadSavedDesigns: async () => {
    const designs = await designService.listDesigns();
    set({ savedDesigns: designs });
  },

  // Exportar design
  exportDesign: (designId) => {
    const state = get();
    const design = state.designs.find(d => d.id === designId);
    if (design) {
      const json = designService.exportDesign(designId);
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(json)
      );
      element.setAttribute('download', `${design.name}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  },

  // Importar design
  importDesign: (json) => {
    const design = designService.importDesign(json);
    set(state => ({
      designs: [...state.designs, design],
      currentDesign: design,
    }));
  },

  // Atualizar propriedade do design
  updateDesignProperty: (property, value) => {
    set(state => {
      if (!state.currentDesign) return state;

      return {
        currentDesign: {
          ...state.currentDesign,
          [property]: value,
          updatedAt: new Date(),
        },
      };
    });
  },
}));
