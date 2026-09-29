import type { Station } from './api';

// Fictional fixtures only. Never mixed into connected-provider results.
export const demoStations: Station[] = [
  {
    id: 'demo-1',
    provider_id: 'Demo Network A',
    name: 'Indiranagar Charge Garden',
    address: 'Sample location · 100 Feet Road',
    city: 'Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    distance_meters: 1200,
    available_connectors: 3,
    max_power_kw: 120,
    connector_standards: ['IEC_62196_T2_COMBO'],
    connectors: [
      { id: 'a', standard: 'IEC_62196_T2_COMBO', status: 'AVAILABLE', power_kw: 120 },
      { id: 'b', standard: 'IEC_62196_T2_COMBO', status: 'AVAILABLE', power_kw: 60 },
      { id: 'c', standard: 'IEC_62196_T2_COMBO', status: 'AVAILABLE', power_kw: 60 },
    ],
  },
  {
    id: 'demo-2',
    provider_id: 'Demo Network B',
    name: 'Lakeside Charging Hub',
    address: 'Sample location · Old Madras Road',
    city: 'Bengaluru',
    latitude: 12.991,
    longitude: 77.655,
    distance_meters: 2700,
    available_connectors: 1,
    max_power_kw: 60,
    connector_standards: ['IEC_62196_T2_COMBO', 'IEC_62196_T2'],
    connectors: [
      { id: 'd', standard: 'IEC_62196_T2_COMBO', status: 'AVAILABLE', power_kw: 60 },
      { id: 'e', standard: 'IEC_62196_T2', status: 'CHARGING', power_kw: 22 },
    ],
  },
  {
    id: 'demo-3',
    provider_id: 'Demo Network A',
    name: 'The Greenway Stop',
    address: 'Sample location · Whitefield',
    city: 'Bengaluru',
    latitude: 12.97,
    longitude: 77.7,
    distance_meters: 5600,
    available_connectors: 0,
    max_power_kw: 22,
    connector_standards: ['IEC_62196_T2'],
    connectors: [{ id: 'f', standard: 'IEC_62196_T2', status: 'CHARGING', power_kw: 22 }],
  },
];
