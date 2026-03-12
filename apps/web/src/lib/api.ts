import { getToken } from './auth';
import type {
  AuthResponse,
  RegisterDto,
  LoginDto,
  WhatsAppSessionDto,
  GroupDto,
  UserFilterDto,
  OpportunityDto,
  IncomingMessageDto,
  AuditLogDto,
  PaginatedResponse,
} from '@plantao-radar/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { message?: string };
      message = err.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (dto: RegisterDto) => post<AuthResponse>('/auth/register', dto),
  login: (dto: LoginDto) => post<AuthResponse>('/auth/login', dto),
  logout: () => post<void>('/auth/logout'),
  me: () => get<AuthResponse['user']>('/auth/me'),
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export const whatsappApi = {
  createSession: () => post<WhatsAppSessionDto & { qrCode?: string }>('/whatsapp/session'),
  getSession: () => get<WhatsAppSessionDto | null>('/whatsapp/session'),
  disconnect: () => post<{ message: string }>('/whatsapp/session/disconnect'),
  syncGroups: () => get<{ synced: number; groups: GroupDto[] }>('/whatsapp/groups/sync'),
};

// ─── Groups ────────────────────────────────────────────────────────────────────

export const groupsApi = {
  list: () => get<GroupDto[]>('/groups'),
  setMonitoring: (groupId: string, monitoringEnabled: boolean, priority?: number) =>
    post('/groups/monitor', { groupId, monitoringEnabled, priority }),
};

// ─── Filters ─────────────────────────────────────────────────────────────────

export const filtersApi = {
  get: () => get<UserFilterDto | null>('/filters'),
  upsert: (dto: UserFilterDto) => put<UserFilterDto>('/filters', dto),
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  list: (page = 1, limit = 20) =>
    get<PaginatedResponse<IncomingMessageDto>>(`/messages?page=${page}&limit=${limit}`),
  opportunities: (page = 1, limit = 20) =>
    get<PaginatedResponse<OpportunityDto>>(`/opportunities?page=${page}&limit=${limit}`),
  approve: (id: string) => post<void>(`/opportunities/${id}/approve`),
  reject: (id: string) => post<void>(`/opportunities/${id}/reject`),
};

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const logsApi = {
  list: (page = 1, limit = 50) =>
    get<PaginatedResponse<AuditLogDto>>(`/logs?page=${page}&limit=${limit}`),
};

export { ApiError };
