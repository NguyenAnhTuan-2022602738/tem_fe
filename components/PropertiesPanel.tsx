
import React, { useState } from 'react';
import { CanvasItem, ItemType, Folder, Size, TemplateField } from '../types';
import { generateLabelContent } from '../services/geminiService';

interface PropertiesPanelProps {
  selectedItem: CanvasItem | null;
  onUpdateItem: (id: string, updates: Partial<CanvasItem>) => void;
  onDeleteItem: (id: string) => void;
  canvasSize: Size;
  onUpdateCanvasSize: (size: Size) => void;
  onSaveTemplate: (name: string, folderId: string | null) => void;
  folders: Folder[];
  currentTemplateName: string;
  onOpenPrintModal: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  selectedFolderId: string | null;
  fields: TemplateField[];
  onOpenMergeModal: () => void;
  onRefreshFields: () => void;
  isRefreshingFields: boolean;
  canMerge: boolean;
}

const FONT_OPTIONS = [
  { label: 'Inter (Mặc định)', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Dancing Script (Viết tay)', value: 'Dancing Script' },
  { label: 'Pacifico (Bay bổng)', value: 'Pacifico' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedItem,
  onUpdateItem,
  onDeleteItem,
  canvasSize,
  onUpdateCanvasSize,
  onSaveTemplate,
  folders,
  currentTemplateName,
  onOpenPrintModal,
  zoom,
  setZoom,
  selectedFolderId,
  fields,
  onOpenMergeModal,
  onRefreshFields,
  isRefreshingFields,
  canMerge
}) => {
  const [templateName, setTemplateName] = useState(currentTemplateName);
  const [saveFolderId, setSaveFolderId] = useState(selectedFolderId || '');
  
  // AI State
  const [aiContext, setAiContext] = useState('');
  const [aiProduct, setAiProduct] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Effect to sync template name when loaded
  React.useEffect(() => {
    setTemplateName(currentTemplateName);
  }, [currentTemplateName]);

  React.useEffect(() => {
    if(selectedFolderId) setSaveFolderId(selectedFolderId);
  }, [selectedFolderId]);

  const handleAiGenerate = async () => {
    if (!selectedItem || selectedItem.type !== ItemType.TEXT) return;
    setIsGenerating(true);
    const text = await generateLabelContent(aiContext, aiProduct);
    onUpdateItem(selectedItem.id, { content: text });
    setIsGenerating(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    if (file && selectedItem) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateItem(selectedItem.id, { content: reader.result as string });
        input.value = '';
      };
      reader.readAsDataURL(file);
    } else {
      input.value = '';
    }
  };

  // Helper to flatten folders for the select dropdown
  const renderFolderOptions = (parentId: string | null = null, prefix = '') => {
    return folders
      .filter(f => f.parentId === parentId)
      .map(f => (
        <React.Fragment key={f.id}>
          <option value={f.id}>{prefix}{f.name}</option>
          {renderFolderOptions(f.id, prefix + '-- ')}
        </React.Fragment>
      ));
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto shadow-xl z-10">
      
      {/* Top Actions */}
      <div className="p-4 border-b border-slate-100">
        <button 
          onClick={onOpenPrintModal}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-semibold flex justify-center items-center gap-2 shadow-md transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Cấu hình in & In
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Template Settings (Global) */}
        {!selectedItem && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Thông tin Tem</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tên Mẫu</label>
              <input 
                type="text" 
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ví dụ: Tem Cafe 5x5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rộng (mm)</label>
                <input 
                  type="number" 
                  value={canvasSize.width}
                  onChange={(e) => onUpdateCanvasSize({ ...canvasSize, width: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cao (mm)</label>
                <input 
                  type="number" 
                  value={canvasSize.height}
                  onChange={(e) => onUpdateCanvasSize({ ...canvasSize, height: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Lưu vào thư mục</label>
              <select 
                value={saveFolderId}
                onChange={(e) => setSaveFolderId(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Thư mục gốc</option>
                {renderFolderOptions()}
              </select>
            </div>

            <button 
              onClick={() => onSaveTemplate(templateName, saveFolderId || null)}
              disabled={!templateName}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Lưu Mẫu Tem
            </button>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Trường dữ liệu</p>
                  <p className="text-[11px] text-slate-400">Thêm văn bản dạng {'{{ma_san_pham}}'} để hệ thống tự nhận.</p>
                </div>
                <button
                  onClick={onRefreshFields}
                  disabled={!canMerge || isRefreshingFields}
                  className="text-xs font-semibold px-3 py-1.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefreshingFields ? 'Đang quét...' : 'Nhận diện'}
                </button>
              </div>
              {fields.length ? (
                <div className="flex flex-wrap gap-1">
                  {fields.map(field => (
                    <span
                      key={field.name}
                      className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-full text-slate-600"
                    >
                      {`{{${field.name}}}`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {canMerge ? 'Chưa tìm thấy placeholder nào, hãy thêm vào nội dung tem rồi nhấn Nhận diện.' : 'Lưu mẫu để bật tính năng điền phôi.'}
                </p>
              )}
              <button
                onClick={onOpenMergeModal}
                disabled={!canMerge || !fields.length}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Điền dữ liệu phôi
              </button>
            </div>

            <div className="pt-4 border-t">
               <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
               </div>
               <input 
                 type="range" 
                 min="0.5" 
                 max="2" 
                 step="0.1"
                 value={zoom}
                 onChange={(e) => setZoom(Number(e.target.value))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
               />
            </div>
          </div>
        )}

        {/* Item Properties (Contextual) */}
        {selectedItem && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                {selectedItem.type === ItemType.TEXT ? 'Văn bản' : selectedItem.type === ItemType.QR ? 'Mã QR' : 'Hình ảnh'}
              </h3>
              <button 
                onClick={() => onDeleteItem(selectedItem.id)}
                className="text-red-500 hover:text-red-700 text-xs font-medium bg-red-50 px-2 py-1 rounded"
              >
                Xóa
              </button>
            </div>

            {/* Common: Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">X (px)</label>
                <input 
                  type="number" 
                  value={Math.round(selectedItem.x)}
                  onChange={(e) => onUpdateItem(selectedItem.id, { x: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Y (px)</label>
                <input 
                  type="number" 
                  value={Math.round(selectedItem.y)}
                  onChange={(e) => onUpdateItem(selectedItem.id, { y: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            
            {/* Common: Size (except Text) */}
            {selectedItem.type !== ItemType.TEXT && (
               <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Rộng (px)</label>
                 <input 
                   type="number" 
                   value={Math.round(selectedItem.width)}
                   onChange={(e) => onUpdateItem(selectedItem.id, { width: Number(e.target.value) })}
                   className="w-full border rounded px-2 py-1 text-sm"
                 />
               </div>
               <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Cao (px)</label>
                 <input 
                   type="number" 
                   value={Math.round(selectedItem.height)}
                   onChange={(e) => onUpdateItem(selectedItem.id, { height: Number(e.target.value) })}
                   className="w-full border rounded px-2 py-1 text-sm"
                 />
               </div>
             </div>
            )}

            {/* Text Specific */}
            {selectedItem.type === ItemType.TEXT && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nội dung</label>
                  <textarea 
                    value={selectedItem.content}
                    onChange={(e) => onUpdateItem(selectedItem.id, { content: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm h-20 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cỡ chữ</label>
                    <input 
                      type="number" 
                      value={selectedItem.fontSize}
                      onChange={(e) => onUpdateItem(selectedItem.id, { fontSize: Number(e.target.value) })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Màu sắc</label>
                    <input 
                      type="color" 
                      value={selectedItem.color}
                      onChange={(e) => onUpdateItem(selectedItem.id, { color: e.target.value })}
                      className="w-full h-9 border rounded cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Font chữ</label>
                  <select 
                    value={selectedItem.fontFamily || 'Inter'}
                    onChange={(e) => onUpdateItem(selectedItem.id, { fontFamily: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                  >
                    {FONT_OPTIONS.map(font => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Formatting Toolbar */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500">Định dạng</label>
                    
                    {/* Style Buttons */}
                    <div className="flex border rounded overflow-hidden bg-white">
                        <button
                            title="In đậm (Bold)"
                            onClick={() => onUpdateItem(selectedItem.id, { fontWeight: selectedItem.fontWeight === 'bold' ? 'normal' : 'bold' })}
                            className={`flex-1 py-1.5 hover:bg-indigo-50 font-bold text-slate-700 ${selectedItem.fontWeight === 'bold' ? 'bg-indigo-100 text-indigo-700' : ''}`}
                        >
                            B
                        </button>
                        <div className="w-px bg-slate-200"></div>
                        <button
                            title="In nghiêng (Italic)"
                            onClick={() => onUpdateItem(selectedItem.id, { fontStyle: selectedItem.fontStyle === 'italic' ? 'normal' : 'italic' })}
                            className={`flex-1 py-1.5 hover:bg-indigo-50 italic text-slate-700 ${selectedItem.fontStyle === 'italic' ? 'bg-indigo-100 text-indigo-700' : ''}`}
                        >
                            I
                        </button>
                        <div className="w-px bg-slate-200"></div>
                        <button
                             title="Gạch chân (Underline)"
                            onClick={() => onUpdateItem(selectedItem.id, { textDecoration: selectedItem.textDecoration === 'underline' ? 'none' : 'underline' })}
                            className={`flex-1 py-1.5 hover:bg-indigo-50 underline text-slate-700 ${selectedItem.textDecoration === 'underline' ? 'bg-indigo-100 text-indigo-700' : ''}`}
                        >
                            U
                        </button>
                    </div>

                    {/* Alignment Buttons */}
                    <div className="flex border rounded overflow-hidden bg-white mt-2">
                        <button
                            title="Căn trái"
                            onClick={() => onUpdateItem(selectedItem.id, { textAlign: 'left' })}
                            className={`flex-1 py-1.5 flex justify-center items-center hover:bg-indigo-50 ${selectedItem.textAlign === 'left' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}`}
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h7" /></svg>
                        </button>
                        <div className="w-px bg-slate-200"></div>
                        <button
                            title="Căn giữa"
                            onClick={() => onUpdateItem(selectedItem.id, { textAlign: 'center' })}
                            className={`flex-1 py-1.5 flex justify-center items-center hover:bg-indigo-50 ${selectedItem.textAlign === 'center' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}`}
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div className="w-px bg-slate-200"></div>
                        <button
                            title="Căn phải"
                            onClick={() => onUpdateItem(selectedItem.id, { textAlign: 'right' })}
                            className={`flex-1 py-1.5 flex justify-center items-center hover:bg-indigo-50 ${selectedItem.textAlign === 'right' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}`}
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M13 18h7" /></svg>
                        </button>
                    </div>
                </div>

                 {/* AI Helper */}
                 <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 shadow-sm mt-4">
                    <div className="flex items-center gap-1 mb-2">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span className="text-xs font-bold text-indigo-700">AI Writer</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Sản phẩm (vd: Trà sữa)" 
                      value={aiProduct}
                      onChange={(e) => setAiProduct(e.target.value)}
                      className="w-full text-xs border border-indigo-200 rounded px-2 py-1 mb-2 bg-white"
                    />
                    <input 
                      type="text" 
                      placeholder="Ý chính (vd: Ngon, rẻ)" 
                      value={aiContext}
                      onChange={(e) => setAiContext(e.target.value)}
                      className="w-full text-xs border border-indigo-200 rounded px-2 py-1 mb-2 bg-white"
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !aiProduct}
                      className="w-full bg-indigo-600 text-white text-xs py-1.5 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating ? 'Đang suy nghĩ...' : 'Viết nội dung'}
                    </button>
                 </div>
              </>
            )}

            {/* QR Specific */}
            {selectedItem.type === ItemType.QR && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Dữ liệu QR</label>
                <input 
                  type="text"
                  value={selectedItem.content}
                  onChange={(e) => onUpdateItem(selectedItem.id, { content: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Image Specific */}
            {selectedItem.type === ItemType.IMAGE && (
                <div>
                     <label className="block text-xs font-medium text-slate-500 mb-1">Tải ảnh lên</label>
                     <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="mb-2 text-xs text-slate-500"><span className="font-semibold">Click để tải</span></p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {selectedItem.content && (
                        <div className="mt-2 text-xs text-center text-slate-400">
                            Đã chọn ảnh
                        </div>
                    )}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
