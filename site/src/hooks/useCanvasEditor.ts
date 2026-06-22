/**
 * 🎨 Canvas Editor Hook - Gerencia estado do editor
 */

import { useState, useCallback, useRef } from 'react';
import { Design, Asset } from '@/services/designService';

export interface EditorState {
  selectedAssetId: string | null;
  zoom: number;
  isPanning: boolean;
}

export function useCanvasEditor(initialDesign: Design) {
  const [design, setDesign] = useState<Design>(initialDesign);
  const [state, setState] = useState<EditorState>({
    selectedAssetId: null,
    zoom: 1,
    isPanning: false,
  });

  const undoStackRef = useRef<Design[]>([initialDesign]);
  const redoStackRef = useRef<Design[]>([]);

  /**
   * Adicionar asset
   */
  const addAsset = useCallback((asset: Asset) => {
    setDesign(prev => {
      const updated = { ...prev, assets: [...prev.assets, asset] };
      undoStackRef.current.push(updated);
      redoStackRef.current = [];
      return updated;
    });
  }, []);

  /**
   * Remover asset
   */
  const removeAsset = useCallback((assetId: string) => {
    setDesign(prev => {
      const updated = {
        ...prev,
        assets: prev.assets.filter(a => a.id !== assetId),
      };
      undoStackRef.current.push(updated);
      redoStackRef.current = [];
      return updated;
    });
  }, []);

  /**
   * Atualizar asset
   */
  const updateAsset = useCallback((assetId: string, updates: Partial<Asset>) => {
    setDesign(prev => {
      const updated = {
        ...prev,
        assets: prev.assets.map(a =>
          a.id === assetId ? { ...a, ...updates } : a
        ),
      };
      undoStackRef.current.push(updated);
      redoStackRef.current = [];
      return updated;
    });
  }, []);

  /**
   * Selecionar asset
   */
  const selectAsset = useCallback((assetId: string | null) => {
    setState(prev => ({ ...prev, selectedAssetId: assetId }));
  }, []);

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.1, 3),
    }));
  }, []);

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - 0.1, 0.5),
    }));
  }, []);

  /**
   * Reset zoom
   */
  const resetZoom = useCallback(() => {
    setState(prev => ({ ...prev, zoom: 1 }));
  }, []);

  /**
   * Undo
   */
  const undo = useCallback(() => {
    if (undoStackRef.current.length > 1) {
      redoStackRef.current.push(undoStackRef.current.pop()!);
      setDesign(undoStackRef.current[undoStackRef.current.length - 1]);
    }
  }, []);

  /**
   * Redo
   */
  const redo = useCallback(() => {
    if (redoStackRef.current.length > 0) {
      const design = redoStackRef.current.pop()!;
      undoStackRef.current.push(design);
      setDesign(design);
    }
  }, []);

  /**
   * Duplicar asset
   */
  const duplicateAsset = useCallback((assetId: string) => {
    const asset = design.assets.find(a => a.id === assetId);
    if (asset) {
      const duplicate = {
        ...asset,
        id: `asset-${Date.now()}`,
        x: asset.x + 10,
        y: asset.y + 10,
      };
      addAsset(duplicate);
    }
  }, [design.assets, addAsset]);

  /**
   * Trazer para frente
   */
  const bringToFront = useCallback((assetId: string) => {
    const maxZ = Math.max(...design.assets.map(a => a.zIndex), 0);
    updateAsset(assetId, { zIndex: maxZ + 1 });
  }, [design.assets, updateAsset]);

  /**
   * Enviar para trás
   */
  const sendToBack = useCallback((assetId: string) => {
    const minZ = Math.min(...design.assets.map(a => a.zIndex), 0);
    updateAsset(assetId, { zIndex: minZ - 1 });
  }, [design.assets, updateAsset]);

  /**
   * Alinhar
   */
  const align = useCallback(
    (assetId: string, direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      const asset = design.assets.find(a => a.id === assetId);
      if (!asset) return;

      let updates: Partial<Asset> = {};

      switch (direction) {
        case 'left':
          updates = { x: 0 };
          break;
        case 'center':
          updates = { x: (design.width - asset.width) / 2 };
          break;
        case 'right':
          updates = { x: design.width - asset.width };
          break;
        case 'top':
          updates = { y: 0 };
          break;
        case 'middle':
          updates = { y: (design.height - asset.height) / 2 };
          break;
        case 'bottom':
          updates = { y: design.height - asset.height };
          break;
      }

      updateAsset(assetId, updates);
    },
    [design, updateAsset]
  );

  /**
   * Mudar cor de fundo
   */
  const setBackgroundColor = useCallback((color: string) => {
    setDesign(prev => {
      const updated = { ...prev, backgroundColor: color };
      undoStackRef.current.push(updated);
      redoStackRef.current = [];
      return updated;
    });
  }, []);

  /**
   * Remover seleção
   */
  const deselect = useCallback(() => {
    setState(prev => ({ ...prev, selectedAssetId: null }));
  }, []);

  return {
    design,
    setDesign,
    state,
    // Métodos
    addAsset,
    removeAsset,
    updateAsset,
    selectAsset,
    deselect,
    zoomIn,
    zoomOut,
    resetZoom,
    undo,
    redo,
    duplicateAsset,
    bringToFront,
    sendToBack,
    align,
    setBackgroundColor,
    // Estado
    selectedAsset: design.assets.find(a => a.id === state.selectedAssetId) || null,
    canUndo: undoStackRef.current.length > 1,
    canRedo: redoStackRef.current.length > 0,
  };
}
