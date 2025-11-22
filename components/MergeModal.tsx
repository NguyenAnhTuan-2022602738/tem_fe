import React, { useEffect, useMemo, useState } from "react";
import { Folder, TemplateField } from "../types";

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: TemplateField[];
  folders: Folder[];
  defaultFolderId: string | null;
  onMerge: (payload: { folderId: string | null; rows: Record<string, string>[] }) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<Folder | null>;
}

const createEmptyRow = (fields: TemplateField[]): Record<string, string> => {
  const row: Record<string, string> = { __name: "" };
  fields.forEach((field) => {
    row[field.name] = "";
  });
  return row;
};

const buildFolderTree = (folders: Folder[]) => {
  const map = new Map<string | null, Folder[]>();
  folders.forEach((folder) => {
    const key = folder.parentId ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(folder);
  });
  return map;
};

const renderFolderOptions = (
  parentId: string | null,
  tree: Map<string | null, Folder[]>,
  prefix = ""
): React.ReactElement[] => {
  const children = tree.get(parentId) ?? [];
  return children
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((folder) => [
      <option key={folder.id} value={folder.id}>
        {prefix + folder.name}
      </option>,
      ...renderFolderOptions(folder.id, tree, `${prefix}-- `)
    ]);
};

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  fields,
  folders,
  defaultFolderId,
  onMerge,
  onCreateFolder
}) => {
  const [rows, setRows] = useState<Record<string, string>[]>([createEmptyRow(fields)]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "">(defaultFolderId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | "">("");

  useEffect(() => {
    if (isOpen) {
      setRows([createEmptyRow(fields)]);
    }
  }, [isOpen, fields]);

  useEffect(() => {
    setSelectedFolderId(defaultFolderId ?? "");
  }, [defaultFolderId, isOpen]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const handleRowChange = (index: number, key: string, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow(fields)]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const parsed: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const values = lines[i].split(",");
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() ?? "";
      });
      parsed.push(row);
    }
    return parsed;
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() ?? "";
        const parsed = parseCsv(text);
        if (!parsed.length) {
          setCsvError("File không có dữ liệu");
          return;
        }
        const normalized = parsed.map((row) => ({
          __name: row.__name ?? row.name ?? "",
          ...fields.reduce((acc, field) => {
            acc[field.name] = row[field.name] ?? "";
            return acc;
          }, {} as Record<string, string>)
        }));
        setRows(normalized);
        setCsvError(null);
      } catch (error) {
        console.error("CSV parse error", error);
        setCsvError("Không thể đọc file CSV");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folder = await onCreateFolder(newFolderName.trim(), newFolderParentId || null);
      if (folder) {
        setSelectedFolderId(folder.id);
        setShowCreateFolder(false);
        setNewFolderName("");
        setNewFolderParentId("");
      }
    } catch (error) {
      console.error("Create folder error", error);
    }
  };

  const handleSubmit = async () => {
    const filteredRows = rows
      .map((row) => ({
        ...row,
        __name: row.__name ?? ""
      }))
      .filter((row) => {
        const values = Object.keys(row)
          .filter((key) => key !== "__name")
          .map((key) => row[key]?.trim() ?? "");
        return values.some((value) => value.length);
      });

    if (!filteredRows.length) {
      alert("Vui lòng nhập ít nhất một dòng dữ liệu");
      return;
    }

    setIsSubmitting(true);
    try {
      await onMerge({ folderId: selectedFolderId || null, rows: filteredRows });
      setRows([createEmptyRow(fields)]);
      onClose();
    } catch (error) {
      console.error("Merge error", error);
      alert("Không thể merge, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-slate-800">Điền dữ liệu phôi</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-600 block">Lưu vào thư mục</label>
            <div className="flex gap-3 items-center">
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="border rounded px-3 py-2 text-sm flex-1"
              >
                <option value="">Thư mục gốc</option>
                {renderFolderOptions(null, folderTree)}
              </select>
              <button
                onClick={() => setShowCreateFolder((prev) => !prev)}
                className="px-3 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50"
              >
                + Thư mục
              </button>
            </div>
            {showCreateFolder && (
              <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-3 border">
                <input
                  type="text"
                  placeholder="Tên thư mục"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Thư mục gốc</option>
                  {renderFolderOptions(null, folderTree)}
                </select>
                <button
                  onClick={handleCreateFolder}
                  className="col-span-2 bg-indigo-600 text-white rounded py-1.5 text-sm font-medium"
                >
                  Lưu thư mục
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Dữ liệu điền</h4>
              <label className="text-xs font-medium text-indigo-600 cursor-pointer">
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
            </div>
            {csvError && <p className="text-xs text-red-500">{csvError}</p>}
            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Tên tem</th>
                    {fields.map((field) => (
                      <th key={field.name} className="px-3 py-2 text-left">{field.label}</th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={row.__name ?? ""}
                          onChange={(e) => handleRowChange(index, "__name", e.target.value)}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      {fields.map((field) => (
                        <td key={field.name} className="px-2 py-1">
                          <input
                            type="text"
                            value={row[field.name] ?? ""}
                            onChange={(e) => handleRowChange(index, field.name, e.target.value)}
                            className="w-full border rounded px-2 py-1"
                          />
                        </td>
                      ))}
                      <td className="px-2 text-center">
                        <button
                          onClick={() => handleRemoveRow(index)}
                          className="text-slate-400 hover:text-red-500"
                          disabled={rows.length === 1}
                          title="Xóa dòng"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleAddRow}
              className="text-sm text-indigo-600 font-medium"
            >
              + Thêm dòng
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 text-white rounded font-semibold disabled:opacity-50"
          >
            {isSubmitting ? "Đang xử lý..." : "Merge & Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};
