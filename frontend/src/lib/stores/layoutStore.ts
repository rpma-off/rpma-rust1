import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import React from 'react';

interface LayoutState {
  // Legacy sidebar state (for reference, can be removed later)
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  
  // New contextual sidebar state
  isContextualSidebarOpen: boolean;
  contextualSidebarWidth: number;
  activeModule: string;
  contextualSidebarContent: React.ReactNode | null;
  
  // Contextual sidebar actions
  toggleContextualSidebar: () => void;
  setContextualSidebarOpen: (open: boolean) => void;
  setContextualSidebarWidth: (width: number) => void;
  setActiveModule: (module: string) => void;
  setContextualSidebarContent: (content: React.ReactNode) => void;
  closeContextualSidebar: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      // Legacy state
      isSidebarCollapsed: false,
      isMobileSidebarOpen: false,
      
      // New contextual sidebar state
      isContextualSidebarOpen: true,
      contextualSidebarWidth: 280,
      activeModule: 'dashboard',
      contextualSidebarContent: null,
      
      // Legacy actions
      toggleSidebar: () => set((state) => ({ 
        isSidebarCollapsed: !state.isSidebarCollapsed 
      })),
      
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      
      toggleMobileSidebar: () => set((state) => ({ 
        isMobileSidebarOpen: !state.isMobileSidebarOpen 
      })),
      
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      
      // Contextual sidebar actions
      toggleContextualSidebar: () => set((state) => ({ 
        isContextualSidebarOpen: !state.isContextualSidebarOpen 
      })),
      
      setContextualSidebarOpen: (open) => set({ isContextualSidebarOpen: open }),
      
      setContextualSidebarWidth: (width) => set({ contextualSidebarWidth: width }),
      
      setActiveModule: (module) => set({ activeModule: module }),
      
      setContextualSidebarContent: (content) => set({ contextualSidebarContent: content }),
      
      closeContextualSidebar: () => set({ isContextualSidebarOpen: false }),
    }),
    {
      name: 'layout-storage',
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        isContextualSidebarOpen: state.isContextualSidebarOpen,
        contextualSidebarWidth: state.contextualSidebarWidth,
      }),
    }
  )
);
