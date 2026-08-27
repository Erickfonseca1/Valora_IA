import type {
  ValuationRecord,
  DashboardMetrics,
  DashboardValuationsResponse,
  MarketTrendResponse,
  CreateValuationBody,
  PhotoAnalysisResult,
  ExtractionResult,
  MeData,
  Organization,
  OrganizationDetail,
  Membership,
  Profile,
} from './types'
import { supabase } from './lib/supabase'

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  const { data } = await supabase().auth.getSession()
  if (data.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`
  }
  const orgId = localStorage.getItem('avalia.active-org')
  if (orgId) headers['x-org-id'] = orgId
  return headers
}

async function callApi<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(BASE + url, {
    ...options,
    headers: { ...headers, ...(options?.headers ?? {}) },
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error ?? 'Unknown API error')
  }
  return json.data as T
}

export function createValuation(body: CreateValuationBody): Promise<ValuationRecord> {
  return callApi('/api/valuations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export interface ValuationListParams {
  limit?: number
  offset?: number
  q?: string
  status?: 'active' | 'deleted'
  property_type?: string
}

export function listValuations(params: ValuationListParams): Promise<DashboardValuationsResponse> {
  const query = new URLSearchParams()
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.offset != null) query.set('offset', String(params.offset))
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.property_type) query.set('property_type', params.property_type)
  const qs = query.toString()
  return callApi(`/api/valuations${qs ? `?${qs}` : ''}`)
}

export function deleteValuation(id: string): Promise<{ ok: true }> {
  return callApi(`/api/valuations/${id}`, { method: 'DELETE' })
}

export function restoreValuation(id: string): Promise<{ ok: true }> {
  return callApi(`/api/valuations/${id}`, { method: 'POST' })
}

export async function uploadPhotos(files: File[]): Promise<{ urls: string[] }> {
  const formData = new FormData();
  files.forEach(f => formData.append("photos", f));
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/api/upload-photos`, {
    method: "POST",
    headers,
    body: formData,
  });
  const json = await res.json() as { success: boolean; data?: { urls: string[] }; error?: string };
  if (!json.success) throw new Error(json.error ?? 'Upload failed');
  return json.data!;
}

/** Uploads files per room and returns [{ room, url }] in submission order. */
export async function uploadPhotosByRoom(
  roomPhotos: Record<string, File[]>
): Promise<{ room: string; url: string }[]> {
  const out: { room: string; url: string }[] = [];
  for (const [room, files] of Object.entries(roomPhotos)) {
    if (!files.length) continue;
    const { urls } = await uploadPhotos(files);
    urls.forEach(url => out.push({ room, url }));
  }
  return out;
}

export async function analyzePhotos(photos: string[]): Promise<PhotoAnalysisResult> {
  return callApi<PhotoAnalysisResult>("/api/analyze-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos }),
  });
}

export function getValuation(id: string): Promise<ValuationRecord> {
  return callApi(`/api/valuations/${id}`)
}

export function getDashboardMetrics(): Promise<DashboardMetrics> {
  return callApi('/api/dashboard/metrics')
}

export function getDashboardValuations(limit = 10, offset = 0): Promise<DashboardValuationsResponse> {
  return callApi(`/api/dashboard/valuations?limit=${limit}&offset=${offset}`)
}

export function getMarketTrend(city: string, months = 12): Promise<MarketTrendResponse> {
  const query = new URLSearchParams({ city, months: String(months) })
  return callApi(`/api/market/trend?${query.toString()}`)
}

export async function extractProperty(input: Blob | string): Promise<ExtractionResult> {
  if (typeof input === 'string') {
    return callApi<ExtractionResult>('/api/extract-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input }),
    })
  }
  const formData = new FormData()
  formData.append('audio', input, 'audio.webm')
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/extract-property`, {
    method: 'POST',
    headers,
    body: formData,
  })
  const json = await res.json() as { success: boolean; data?: ExtractionResult; error?: string }
  if (!json.success) throw new Error(json.error ?? 'Erro ao processar áudio')
  if (!json.data) throw new Error('Resposta inválida do servidor')
  return json.data
}

// ─── Auth & Organizations ─────────────────────────────────────────────────────

export function completeOnboarding(): Promise<{
  profile: Profile
  organizations: Organization[]
  memberships: Membership[]
}> {
  return callApi('/api/auth/onboarding', { method: 'POST' })
}

export function fetchMe(): Promise<MeData> {
  return callApi('/api/me')
}

export function updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'creci' | 'cnai' | 'avatar_url'>>): Promise<MeData> {
  return callApi('/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export function createOrganization(name: string, type: 'imobiliaria' | 'escritorio'): Promise<{ organization: Organization; membership: Membership }> {
  return callApi('/api/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type }),
  })
}

export function getOrganization(id: string): Promise<OrganizationDetail> {
  return callApi(`/api/organizations/${id}`)
}

export function updateOrganization(
  id: string,
  patch: Partial<Pick<Organization, 'name' | 'type' | 'logo_url'>>
): Promise<Organization> {
  return callApi(`/api/organizations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export function inviteMember(orgId: string, email: string, role: 'avaliador' | 'admin'): Promise<{ invite: { token: string } }> {
  return callApi(`/api/organizations/${orgId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  })
}

export function acceptInvite(token: string): Promise<{ organization: Organization; membership: Membership }> {
  return callApi('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

export function changeMemberRole(orgId: string, userId: string, role: 'owner' | 'admin' | 'avaliador'): Promise<{ ok: true }> {
  return callApi(`/api/organizations/${orgId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
}

export function removeMember(orgId: string, userId: string): Promise<{ ok: true }> {
  return callApi(`/api/organizations/${orgId}/members/${userId}`, { method: 'DELETE' })
}

export async function uploadLogo(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('logo', file)
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/upload-logo`, {
    method: 'POST',
    headers,
    body: formData,
  })
  const json = await res.json() as { success: boolean; data?: { url: string }; error?: string }
  if (!json.success) throw new Error(json.error ?? 'Upload falhou')
  return json.data!
}