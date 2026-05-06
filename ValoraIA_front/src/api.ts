import type {
  ValuationRecord,
  DashboardMetrics,
  DashboardValuationsResponse,
  MarketTrendResponse,
  CreateValuationBody,
  PhotoAnalysisResult,
} from './types'

const BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''

async function callApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, options)
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

export async function uploadPhotos(files: File[]): Promise<{ urls: string[] }> {
  const formData = new FormData();
  files.forEach(f => formData.append("photos", f));
  const res = await fetch(`${BASE}/api/upload-photos`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json() as { success: boolean; data?: { urls: string[] }; error?: string };
  if (!json.success) throw new Error(json.error ?? 'Upload failed');
  return json.data!;
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

export function getDashboardValuations(
  limit = 10,
  offset = 0
): Promise<DashboardValuationsResponse> {
  return callApi(`/api/dashboard/valuations?limit=${limit}&offset=${offset}`)
}

export function getMarketTrend(city: string, months = 12): Promise<MarketTrendResponse> {
  return callApi(`/api/market/trend?city=${encodeURIComponent(city)}&months=${months}`)
}
