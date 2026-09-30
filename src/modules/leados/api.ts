import type {
  CreateLeadInput,
  CreateLeadTaskInput,
  LeadListQuery,
  SlaPolicyInput,
  UpdateLeadInput,
} from "@/lib/leads/schemas";
import type {
  LeadDetailDto,
  LeadListDto,
  LeadNoteDto,
  LeadOverviewDto,
  LeadTaskDto,
} from "@/lib/leads/types";
import { fetchWithSession } from "@/lib/auth/client-session";

type ApiFailure = { error?: { message?: string; code?: string } };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithSession(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    let failure: ApiFailure = {};
    try {
      failure = (await response.json()) as ApiFailure;
    } catch {
      // Preserve the normalized HTTP status when the body is unavailable.
    }
    const error = new Error(failure.error?.message ?? `Request failed (${response.status})`);
    error.name = failure.error?.code ?? "LEADOS_REQUEST_FAILED";
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function fetchLeadOverview(): Promise<LeadOverviewDto> {
  const response = await request<{ overview: LeadOverviewDto }>("/api/leados/overview");
  return response.overview;
}

export async function fetchLeadList(query: Partial<LeadListQuery>): Promise<LeadListDto> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return request<LeadListDto>(`/api/leados/leads?${params.toString()}`);
}

export async function fetchLeadDetail(id: string): Promise<LeadDetailDto> {
  const response = await request<{ lead: LeadDetailDto }>(`/api/leados/leads/${encodeURIComponent(id)}`);
  return response.lead;
}

export async function createLeadRequest(input: CreateLeadInput): Promise<LeadDetailDto> {
  const response = await request<{ lead: LeadDetailDto }>("/api/leados/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.lead;
}

export async function updateLeadRequest(id: string, input: UpdateLeadInput): Promise<LeadDetailDto> {
  const response = await request<{ lead: LeadDetailDto }>(`/api/leados/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.lead;
}

export async function changeLeadStageRequest(
  id: string,
  input: { stageId?: string; stage?: string; pipelineId?: string },
): Promise<LeadDetailDto> {
  const response = await request<{ lead: LeadDetailDto }>(
    `/api/leados/leads/${encodeURIComponent(id)}/stage`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.lead;
}

export async function assignLeadRequest(id: string, ownerId: string | null): Promise<LeadDetailDto> {
  const response = await request<{ lead: LeadDetailDto }>(
    `/api/leados/leads/${encodeURIComponent(id)}/assign`,
    { method: "POST", body: JSON.stringify({ ownerId }) },
  );
  return response.lead;
}

export async function addLeadNoteRequest(id: string, body: string): Promise<LeadNoteDto> {
  const response = await request<{ note: LeadNoteDto }>(
    `/api/leados/leads/${encodeURIComponent(id)}/notes`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
  return response.note;
}

export async function createLeadTaskRequest(
  id: string,
  input: CreateLeadTaskInput,
): Promise<LeadTaskDto> {
  const response = await request<{ task: LeadTaskDto }>(
    `/api/leados/leads/${encodeURIComponent(id)}/tasks`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.task;
}

export async function completeLeadTaskRequest(id: string, completed: boolean): Promise<LeadTaskDto> {
  const response = await request<{ task: LeadTaskDto }>(
    `/api/leados/tasks/${encodeURIComponent(id)}/complete`,
    { method: "POST", body: JSON.stringify({ completed }) },
  );
  return response.task;
}

export async function updateSlaPolicyRequest(input: SlaPolicyInput) {
  return request<{ slaPolicy: LeadOverviewDto["slaPolicy"] }>("/api/leados/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

