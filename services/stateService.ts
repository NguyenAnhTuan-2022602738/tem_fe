import { CanvasItem, Folder, LabelTemplate } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const jsonRequest = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const listFolders = () => jsonRequest<Folder[]>("/api/folders");

export const createFolder = (payload: { name: string; parentId: string | null }) =>
  jsonRequest<Folder>("/api/folders", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const deleteFolder = (id: string) =>
  jsonRequest<{ deletedFolderIds: string[]; deletedTemplateIds: string[] }>(`/api/folders/${id}`, {
    method: "DELETE"
  });

export const listTemplates = () => jsonRequest<LabelTemplate[]>("/api/templates");

export const createTemplate = (payload: {
  name: string;
  folderId: string | null;
  width: number;
  height: number;
  items: CanvasItem[];
}) =>
  jsonRequest<LabelTemplate>("/api/templates", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateTemplate = (id: string, payload: {
  name: string;
  folderId: string | null;
  width: number;
  height: number;
  items: CanvasItem[];
}) =>
  jsonRequest<LabelTemplate>(`/api/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const deleteTemplate = (id: string) =>
  jsonRequest<void>(`/api/templates/${id}`, {
    method: "DELETE"
  });

export const refreshTemplateFields = (id: string) =>
  jsonRequest<LabelTemplate>(`/api/templates/${id}/fields/refresh`, {
    method: "POST"
  });

export const mergeTemplate = (payload: {
  templateId: string;
  folderId: string | null;
  rows: Record<string, string>[];
}) =>
  jsonRequest<LabelTemplate[]>("/api/merge", {
    method: "POST",
    body: JSON.stringify(payload)
  });
