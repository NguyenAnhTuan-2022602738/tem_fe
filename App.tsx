
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Folder, LabelTemplate, CanvasItem, Size, ItemType, MM_TO_PX, PrintConfig, TemplateField } from './types';
import { MergeModal } from './components/MergeModal';
import {
  createFolder as createFolderApi,
  createTemplate as createTemplateApi,
  deleteFolder as deleteFolderApi,
  deleteTemplate as deleteTemplateApi,
  listFolders,
  listTemplates,
  updateTemplate as updateTemplateApi,
  refreshTemplateFields,
  mergeTemplate as mergeTemplateApi
} from './services/stateService';

// Initial Data
const INITIAL_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Đồ ăn vặt', parentId: null },
  { id: 'f2', name: 'Mỹ phẩm', parentId: null },
];

const DEFAULT_PRINT_CONFIG: PrintConfig = {
    copies: 10,
    pageWidth: 210, // A4
    pageHeight: 297, // A4
    marginTop: 10,
    marginLeft: 10,
    gapX: 2,
    gapY: 2
};

const App: React.FC = () => {
  // -- State --
  const [folders, setFolders] = useState<Folder[]>([]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  // Editor State
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 50, height: 30 }); // Default 50x30mm
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState('');
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [currentTemplateFields, setCurrentTemplateFields] = useState<TemplateField[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isRefreshingFields, setIsRefreshingFields] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  // Derived Selection
  const primarySelectedId = selectedItemIds[selectedItemIds.length - 1] || null;

  // Print State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);

  // -- Persistence --
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const [fetchedFolders, fetchedTemplates] = await Promise.all([
          listFolders(),
          listTemplates()
        ]);

        if (fetchedFolders.length) {
          setFolders(fetchedFolders);
        } else if (INITIAL_FOLDERS.length) {
          try {
            const seeded = await Promise.all(
              INITIAL_FOLDERS.map(folder =>
                createFolderApi({ name: folder.name, parentId: folder.parentId })
              )
            );
            setFolders(seeded);
          } catch (seedError) {
            console.error('Không thể khởi tạo thư mục mẫu', seedError);
            setFolders(INITIAL_FOLDERS);
          }
        }

        setTemplates(fetchedTemplates);
        setCurrentTemplateId(null);
        setCurrentTemplateName('');
      } catch (error) {
        console.error('Không thể tải dữ liệu từ server', error);
        setFolders(INITIAL_FOLDERS);
        setTemplates([]);
      }
    };

    loadInitialState();
  }, []);

  // -- Handlers --

  const handleAddFolder = async (name: string, parentId: string | null) => {
    try {
      const folder = await createFolderApi({ name, parentId });
      setFolders(prev => [...prev, folder]);
      return folder;
    } catch (error) {
      console.error('Không thể tạo thư mục', error);
      alert('Không thể tạo thư mục, vui lòng thử lại.');
      return null;
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const { deletedFolderIds, deletedTemplateIds } = await deleteFolderApi(id);
      setFolders(prev => prev.filter(folder => !deletedFolderIds.includes(folder.id)));
      setTemplates(prev => prev.filter(template => !deletedTemplateIds.includes(template.id)));

      if (selectedFolderId && deletedFolderIds.includes(selectedFolderId)) {
        setSelectedFolderId(null);
      }

      if (currentTemplateId && deletedTemplateIds.includes(currentTemplateId)) {
        setCurrentTemplateId(null);
        setCurrentTemplateName('');
        setItems([]);
      }
    } catch (error) {
      console.error('Không thể xóa thư mục', error);
      alert('Không thể xóa thư mục, vui lòng thử lại.');
    }
  };

  const handleSaveTemplate = async (name: string, folderId: string | null) => {
    try {
      const payload = {
        name,
        folderId,
        width: canvasSize.width,
        height: canvasSize.height,
        items: items.map(item => ({ ...item }))
      };

      let savedTemplate: LabelTemplate;

      if (currentTemplateId) {
        savedTemplate = await updateTemplateApi(currentTemplateId, payload);
      } else {
        const existing = templates.find(
          template => template.name === name && (template.folderId ?? null) === (folderId ?? null)
        );

        if (existing) {
          savedTemplate = await updateTemplateApi(existing.id, payload);
        } else {
          savedTemplate = await createTemplateApi(payload);
        }
      }

      setTemplates(prev => {
        const index = prev.findIndex(template => template.id === savedTemplate.id);
        if (index === -1) return [...prev, savedTemplate];
        const copy = [...prev];
        copy[index] = savedTemplate;
        return copy;
      });

      setCurrentTemplateId(savedTemplate.id);
      setCurrentTemplateName(savedTemplate.name);
      setCurrentTemplateFields(savedTemplate.fields ?? []);
      alert('Đã lưu mẫu thành công!');
    } catch (error) {
      console.error('Không thể lưu mẫu', error);
      alert('Không thể lưu mẫu, vui lòng thử lại.');
    }
  };

  const handleLoadTemplate = (template: LabelTemplate) => {
    if (items.length > 0 && !window.confirm("Mẫu hiện tại chưa lưu sẽ bị mất. Tiếp tục?")) return;

    setCanvasSize({ width: template.width, height: template.height });
    setItems(template.items.map(i => ({...i}))); // Deep copy
    setCurrentTemplateName(template.name);
    setCurrentTemplateId(template.id);
    setCurrentTemplateFields(template.fields ?? []);
    setSelectedItemIds([]);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Xóa mẫu này?')) return;
    try {
      await deleteTemplateApi(templateId);
      setTemplates(prev => prev.filter(template => template.id !== templateId));

      if (currentTemplateId === templateId) {
        setCurrentTemplateId(null);
        setCurrentTemplateName('');
        setItems([]);
        setCurrentTemplateFields([]);
      }
    } catch (error) {
      console.error('Không thể xóa mẫu', error);
      alert('Không thể xóa mẫu, vui lòng thử lại.');
    }
  };

  const handleRefreshFields = async () => {
    if (!currentTemplateId) {
      alert('Hãy lưu mẫu trước khi nhận diện placeholder.');
      return;
    }

    setIsRefreshingFields(true);
    try {
      const updated = await refreshTemplateFields(currentTemplateId);
      setTemplates(prev => {
        const index = prev.findIndex(template => template.id === updated.id);
        if (index === -1) return [...prev, updated];
        const copy = [...prev];
        copy[index] = updated;
        return copy;
      });
      setCurrentTemplateFields(updated.fields ?? []);
    } catch (error) {
      console.error('Không thể làm mới trường dữ liệu', error);
      alert('Không thể làm mới trường dữ liệu, vui lòng thử lại.');
    } finally {
      setIsRefreshingFields(false);
    }
  };

  const handleMergeSubmit = async ({ folderId, rows }: { folderId: string | null; rows: Record<string, string>[] }) => {
    if (!currentTemplateId) {
      alert('Hãy lưu mẫu trước khi merge dữ liệu.');
      return;
    }

    const created = await mergeTemplateApi({ templateId: currentTemplateId, folderId, rows });
    setTemplates(prev => {
      const map = new Map(prev.map(template => [template.id, template] as const));
      created.forEach(template => map.set(template.id, template));
      return Array.from(map.values());
    });

    setSelectedFolderId(folderId);

    alert(`Đã tạo ${created.length} tem mới`);
  };

  const addItem = (type: ItemType) => {
    const newItem: CanvasItem = {
      id: uuidv4(),
      type,
      content: type === ItemType.TEXT ? 'Nội dung...' : type === ItemType.QR ? 'https://example.com' : '',
      x: 10,
      y: 10,
      width: type === ItemType.TEXT ? 0 : 40, // px
      height: type === ItemType.TEXT ? 0 : 40, // px
      fontSize: 14,
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      fontFamily: 'Inter'
    };
    setItems([...items, newItem]);
    setSelectedItemIds([newItem.id]);
  };

  const updateItem = (id: string, updates: Partial<CanvasItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const updateItems = (updates: { id: string; changes: Partial<CanvasItem> }[]) => {
    if (!updates.length) return;
    setItems(prev => {
      const map = new Map(updates.map(u => [u.id, u.changes]));
      return prev.map(item => map.has(item.id) ? { ...item, ...map.get(item.id)! } : item);
    });
  };

  const deleteItems = (ids: string[]) => {
    if (!ids.length) return;
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedItemIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const deleteItem = (id: string) => deleteItems([id]);

  const duplicateItems = (ids: string[]) => {
    if (!ids.length) return;
    const selectedItems = items.filter(item => ids.includes(item.id));
    if (!selectedItems.length) return;

    const clones = selectedItems.map(item => ({
      ...item,
      id: uuidv4(),
      x: item.x + 10,
      y: item.y + 10
    }));

    setItems(prev => [...prev, ...clones]);
    setSelectedItemIds(clones.map(clone => clone.id));
  };

  const handlePrint = () => {
    window.print();
  };

  // Keyboard shortcut for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace') && selectedItemIds.length) {
        e.preventDefault();
        deleteItems(selectedItemIds);
      }

      if (!isTyping && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateItems(selectedItemIds);
      }

      if (!isTyping && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedItemIds(items.map(item => item.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, items]);

  // -- Render --
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Navigation Sidebar */}
      <div className="no-print h-full shrink-0 z-20 shadow-lg">
        <Sidebar
          folders={folders}
          templates={templates}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleAddFolder}
          onSelectTemplate={handleLoadTemplate}
          onDeleteFolder={handleDeleteFolder}
          onDeleteTemplate={handleDeleteTemplate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Toolbar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0 no-print shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg text-slate-800 tracking-tight">
              {currentTemplateName || 'Tem mới'} 
              <span className="text-xs text-slate-400 font-normal ml-2 bg-slate-100 px-2 py-1 rounded-full">
                {canvasSize.width} x {canvasSize.height} mm
              </span>
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => addItem(ItemType.TEXT)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200 shadow-sm"
            >
              <span className="text-lg font-serif">T</span> Văn bản
            </button>
            <button 
              onClick={() => addItem(ItemType.QR)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 6h.01M6 20v-2H4v2h2zm10-10V6h-4v4h4zm-4 4h4v4h-4v-4zm0 10h.01M20 16h.01M16 16h.01M16 6h.01M12 20h4M12 16h.01" /></svg>
              Mã QR
            </button>
             <button 
              onClick={() => addItem(ItemType.IMAGE)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Hình ảnh
            </button>
            <button
              onClick={() => duplicateItems(selectedItemIds)}
              disabled={!selectedItemIds.length}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500"
              title="Nhân bản (Ctrl + D)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 12h10a2 2 0 012 2v4a2 2 0 01-2 2H10a2 2 0 01-2-2v-4z" /></svg>
              Nhân bản
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <Canvas
          items={items}
          size={canvasSize}
          zoom={zoom}
          selectedItemIds={selectedItemIds}
          onSelectItems={setSelectedItemIds}
          onUpdateItem={updateItem}
          onUpdateItems={updateItems}
          onDeleteItem={deleteItem}
          onCanvasClick={() => setSelectedItemIds([])}
        />

      </div>

      {/* Properties Sidebar */}
      <div className="no-print h-full shrink-0 z-20">
        <PropertiesPanel
          selectedItem={items.find(i => i.id === primarySelectedId) || null}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          canvasSize={canvasSize}
          onUpdateCanvasSize={setCanvasSize}
          onSaveTemplate={handleSaveTemplate}
          folders={folders}
          currentTemplateName={currentTemplateName}
          onOpenPrintModal={() => setShowPrintModal(true)}
          zoom={zoom}
          setZoom={setZoom}
          selectedFolderId={selectedFolderId}
          fields={currentTemplateFields}
          onOpenMergeModal={() => setShowMergeModal(true)}
          onRefreshFields={handleRefreshFields}
          isRefreshingFields={isRefreshingFields}
          canMerge={Boolean(currentTemplateId)}
        />
      </div>

      {/* Print Settings Modal */}
      {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
              <div className="bg-white rounded-xl shadow-2xl w-[500px] max-w-full p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Cấu hình trang in</h3>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-500 mb-1">Khổ giấy Rộng (mm)</label>
                              <input type="number" className="w-full border rounded p-2" value={printConfig.pageWidth} onChange={e => setPrintConfig({...printConfig, pageWidth: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-500 mb-1">Khổ giấy Cao (mm)</label>
                              <input type="number" className="w-full border rounded p-2" value={printConfig.pageHeight} onChange={e => setPrintConfig({...printConfig, pageHeight: Number(e.target.value)})} />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-500 mb-1">Lề trên (mm)</label>
                              <input type="number" className="w-full border rounded p-2" value={printConfig.marginTop} onChange={e => setPrintConfig({...printConfig, marginTop: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-500 mb-1">Lề trái (mm)</label>
                              <input type="number" className="w-full border rounded p-2" value={printConfig.marginLeft} onChange={e => setPrintConfig({...printConfig, marginLeft: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-500 mb-1">Khoảng cách ngang (mm)</label>
                              <input type="number" className="w-full border rounded p-2" value={printConfig.gapX} onChange={e => setPrintConfig({...printConfig, gapX: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-500 mb-1">Khoảng cách dọc (mm)</label>
                              <input type="number" className="w-full border rounded p-2" value={printConfig.gapY} onChange={e => setPrintConfig({...printConfig, gapY: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Số lượng tem</label>
                          <input type="number" className="w-full border rounded p-2" value={printConfig.copies} onChange={e => setPrintConfig({...printConfig, copies: Number(e.target.value)})} />
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium">Hủy</button>
                      <button onClick={() => { setShowPrintModal(false); handlePrint(); }} className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 shadow-lg">
                          Tiến hành in
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showMergeModal && (
        <MergeModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          fields={currentTemplateFields}
          folders={folders}
          defaultFolderId={selectedFolderId}
          onMerge={handleMergeSubmit}
          onCreateFolder={handleAddFolder}
        />
      )}

      {/* Hidden Printable Area */}
      <div id="printable-area" className="hidden">
         <div 
            style={{
                width: `${printConfig.pageWidth}mm`,
                paddingTop: `${printConfig.marginTop}mm`,
                paddingLeft: `${printConfig.marginLeft}mm`,
                display: 'flex',
                flexWrap: 'wrap',
                gap: `${printConfig.gapY}mm ${printConfig.gapX}mm`, // row-gap col-gap
            }}
         >
            {Array.from({ length: printConfig.copies }).map((_, idx) => (
                <div 
                key={idx}
                style={{
                    width: `${canvasSize.width}mm`,
                    height: `${canvasSize.height}mm`,
                    position: 'relative',
                    border: '1px dashed #ccc', // Light border for cutting guide
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    pageBreakInside: 'avoid'
                }}
                >
                {items.map(item => (
                    <div
                    key={item.id}
                    style={{
                    position: 'absolute',
                    left: `${item.x / MM_TO_PX}mm`,
                    top: `${item.y / MM_TO_PX}mm`,
                    width: item.type === ItemType.TEXT ? 'auto' : `${item.width / MM_TO_PX}mm`,
                    height: item.type === ItemType.TEXT ? 'auto' : `${item.height / MM_TO_PX}mm`,
                    }}
                >
                    {item.type === ItemType.TEXT && (
                    <div style={{
                        fontSize: `${item.fontSize}px`,
                        fontFamily: item.fontFamily,
                        fontWeight: item.fontWeight,
                        fontStyle: item.fontStyle || 'normal',
                        textDecoration: item.textDecoration || 'none',
                        color: item.color,
                        textAlign: item.textAlign,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.2,
                        width: 'max-content',
                        maxWidth: '100%'
                    }}>
                        {item.content}
                    </div>
                    )}
                    {item.type === ItemType.QR && (
                        <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(item.content)}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    )}
                    {item.type === ItemType.IMAGE && item.content && (
                        <img 
                        src={item.content}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}
                </div>
                ))}
                </div>
            ))}
         </div>
      </div>

    </div>
  );
};

export default App;
