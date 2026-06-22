import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { LatLngBoundsExpression } from 'leaflet'
import type { FrontendComparable, NeighborhoodData } from '../types'
import 'leaflet/dist/leaflet.css'

const PRIMARY = '#0F2561'
const ACCENT = '#C9A227'
const AMBER = '#F59E0B'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

interface Subject { lat: number | null; lng: number | null }

interface Props {
  subject: Subject
  comparables: FrontendComparable[]
  pois: NeighborhoodData | null
  animate?: boolean
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 16 })
    }
  }, [map, points])
  return null
}

export default function ComparablesMap({ subject, comparables, pois, animate = true }: Props) {
  if (subject.lat == null || subject.lng == null) return null

  const comps = comparables.filter((c) => c.lat != null && c.lng != null)
  const poiPlaces = (pois?.pois ?? []).flatMap((cat) => cat.places).filter((p) => p.lat != null && p.lng != null)

  const points: [number, number][] = [
    [subject.lat, subject.lng],
    ...comps.map((c) => [c.lat as number, c.lng as number] as [number, number]),
  ]

  return (
    <MapContainer
      center={[subject.lat, subject.lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', minHeight: 320, borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />

      {poiPlaces.map((p, i) => (
        <CircleMarker
          key={`poi-${i}`}
          center={[p.lat as number, p.lng as number]}
          radius={5}
          pathOptions={{ color: AMBER, fillColor: AMBER, fillOpacity: 0.7, weight: 1 }}
        >
          <Popup>
            <strong>{p.name}</strong><br />
            {p.vicinity}<br />
            <span style={{ color: '#64748B' }}>{p.distance_m} m</span>
          </Popup>
        </CircleMarker>
      ))}

      {comps.map((c, i) => (
        <CircleMarker
          key={`comp-${i}`}
          center={[c.lat as number, c.lng as number]}
          radius={9}
          pathOptions={{
            color: '#fff',
            fillColor: ACCENT,
            fillOpacity: 0.95,
            weight: 2,
            className: animate ? `comp-pin comp-pin-${i}` : undefined,
          }}
        >
          <Popup>
            <strong>{c.neighborhood}</strong><br />
            {BRL.format(c.price_brl)} · {c.area_m2} m²<br />
            <span style={{ color: ACCENT, fontWeight: 700 }}>{BRL.format(c.price_m2_brl)}/m²</span>
            {c.source_url && (<><br /><a href={c.source_url} target="_blank" rel="noreferrer">ver anúncio</a></>)}
          </Popup>
        </CircleMarker>
      ))}

      <CircleMarker
        center={[subject.lat, subject.lng]}
        radius={12}
        pathOptions={{ color: '#fff', fillColor: PRIMARY, fillOpacity: 1, weight: 3 }}
      >
        <Popup><strong>Imóvel avaliado</strong></Popup>
      </CircleMarker>
    </MapContainer>
  )
}
