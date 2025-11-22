import React, { useState } from 'react';
import { Folder, LabelTemplate } from '../types';

interface SidebarProps {
  folders: Folder[];
  templates: LabelTemplate[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<Folder | null>;
  onSelectTemplate: (template: LabelTemplate) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  templates,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onSelectTemplate,
  onDeleteFolder,
  onDeleteTemplate
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingInFolderId, setCreatingInFolderId] = useState<string | undefined>(undefined); // undefined = not creating, null = root, string = folderId
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folderId)) newSet.delete(folderId);
    else newSet.add(folderId);
    setExpandedFolders(newSet);
  };

  const handleCreateStart = (parentId: string | null) => {
    setCreatingInFolderId(parentId);
    setNewFolderName('');
    if (parentId) {
      const newSet = new Set(expandedFolders);
      newSet.add(parentId);
      setExpandedFolders(newSet);
    }
  };

  const handleCreateConfirm = async () => {
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim(), creatingInFolderId === undefined ? null : creatingInFolderId);
      setNewFolderName('');
      setCreatingInFolderId(undefined);
    } else {
      setCreatingInFolderId(undefined);
    }
  };

  // Helper to get templates directly in a folder
  const getTemplatesInFolder = (folderId: string | null) => {
    return templates.filter(t => t.folderId === folderId);
  };

  const currentTemplates = getTemplatesInFolder(selectedFolderId);

  // Recursive Folder Renderer
  const renderFolderTree = (parentId: string | null, depth = 0) => {
    const childFolders = folders.filter(f => f.parentId === parentId);

    return (
      <ul className="space-y-1">
        {/* Input for new folder at this level */}
        {creatingInFolderId === parentId && (
           <li className="ml-2 mb-1" style={{ paddingLeft: `${depth * 12}px` }}>
             <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs border border-indigo-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tên thư mục..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                  onBlur={handleCreateConfirm}
                />
             </div>
           </li>
        )}

        {childFolders.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isExpanded = expandedFolders.has(folder.id);
          const isSelected = selectedFolderId === folder.id;

          return (
            <li key={folder.id}>
              <div 
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onSelectFolder(folder.id)}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
                    className={`p-0.5 rounded hover:bg-slate-200 text-slate-400 ${!hasChildren && 'invisible'}`}
                  >
                     <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                  
                  <svg className={`w-4 h-4 shrink-0 ${isSelected ? 'fill-indigo-400 text-indigo-600' : 'fill-amber-200 text-amber-400'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  
                  <span className="text-sm font-medium truncate select-none">{folder.name}</span>
                </div>

                <div className="hidden group-hover:flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCreateStart(folder.id); }}
                    title="Thêm thư mục con"
                    className="text-slate-400 hover:text-indigo-600 p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('Xóa thư mục này?')) onDeleteFolder(folder.id); }}
                    title="Xóa thư mục"
                    className="text-slate-400 hover:text-red-500 p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              
              {/* Render Children */}
              {isExpanded && renderFolderTree(folder.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          LabelCraft
        </h1>
      </div>

      {/* Folders Section */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex justify-between items-center px-2 mb-2 mt-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quản lý file</h2>
          <button 
            onClick={() => handleCreateStart(null)}
            className="text-indigo-600 hover:bg-indigo-50 rounded px-2 py-0.5 text-xs font-semibold transition-colors"
          >
            + Thư mục gốc
          </button>
        </div>

        {/* Root Button */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full text-left px-2 py-1.5 mb-1 rounded-md text-sm flex items-center gap-2 transition-colors ${
            selectedFolderId === null ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
           <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span className="font-medium">Tất cả Tem</span>
        </button>

        {/* Tree */}
        {renderFolderTree(null)}
      </div>

      {/* Templates List (Fixed height at bottom or simple scroll) */}
      <div className="border-t border-slate-200 h-1/3 flex flex-col bg-slate-50">
        <div className="p-3 pb-2 border-b border-slate-200 bg-white sticky top-0">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {selectedFolderId ? 'Mẫu trong thư mục' : 'Tất cả mẫu'} ({currentTemplates.length})
             </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {currentTemplates.length === 0 ? (
            <div className="text-center pt-8">
                <p className="text-xs text-slate-400 italic">Trống</p>
            </div>
            ) : (
            currentTemplates.map(template => (
                <div 
                    key={template.id}
                    onClick={() => onSelectTemplate(template)}
                    className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all group"
                >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-700 text-sm truncate">{template.name}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTemplate(template.id); }}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                    title="Xóa mẫu"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {template.width} x {template.height} mm
                    </span>
                    <span className="text-indigo-500 text-xs opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                        Sửa &rarr;
                    </span>
                </div>
                </div>
            ))
            )}
        </div>
      </div>
    </div>
  );
};