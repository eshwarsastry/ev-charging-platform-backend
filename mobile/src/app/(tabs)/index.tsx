import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { API_URL, connectorLabel, messageOf, request, type Station } from '../../lib/api';
import { demoStations } from '../../lib/demo';
import { Button, colors, Loading, Notice, Page, s } from '../../components/ui';

export default function Discover() {
  const [demo, setDemo] = useState(!API_URL);
  const [stations, setStations] = useState<Station[]>(!API_URL ? demoStations : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All chargers');
  const [latitude, setLatitude] = useState('12.9784');
  const [longitude, setLongitude] = useState('77.6408');
  const generation = useRef(0);

  async function search(gps = false) {
    const current = ++generation.current;
    setError('');
    setLoading(true);
    try {
      if (!latitude.trim() || !longitude.trim())
        throw new Error('Enter both latitude and longitude.');
      let lat = Number(latitude),
        lon = Number(longitude);
      if (gps) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted')
          throw new Error(
            'Location permission was declined. You can search using coordinates instead.',
          );
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      }
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      )
        throw new Error('Enter valid latitude and longitude.');
      const result = await request<{ data: Station[] }>(
        `/v1/stations/nearby?latitude=${lat}&longitude=${lon}&radiusMeters=25000&limit=100`,
      );
      if (current === generation.current) {
        setLatitude(String(lat));
        setLongitude(String(lon));
        setStations(result.data);
      }
    } catch (e) {
      if (current === generation.current) {
        setError(messageOf(e));
        setStations([]);
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  const visible = stations.filter(
    (station) =>
      `${station.name} ${station.provider_id} ${station.city}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter !== 'Available' || (station.available_connectors || 0) > 0) &&
      (filter !== '50+ kW' || (station.max_power_kw || 0) >= 50),
  );
  return (
    <Page>
      <View style={s.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="zap" color={colors.green} size={25} />
          <Text style={{ fontSize: 20, color: colors.ink, fontWeight: '800' }}>ohmcharge</Text>
        </View>
        <Text style={s.badge}>INDIA</Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.eyebrow}>A little charge. A lot of possibility.</Text>
        <Text style={s.title}>Your next stop,{'\n'}fully charged.</Text>
        <Text style={s.text}>Find a charger that fits your journey.</Text>
      </View>
      <View style={{ backgroundColor: colors.ink, padding: 22, borderRadius: 24, gap: 16 }}>
        <View style={s.row}>
          <Feather name="map-pin" size={22} color={colors.lime} />
          <Text style={{ color: colors.lime, fontSize: 11, letterSpacing: 2 }}>
            {demo ? 'EXPLORING THE DEMO' : 'CONNECTED DISCOVERY'}
          </Text>
        </View>
        <Text style={{ color: 'white', fontSize: 23, fontWeight: '600' }}>
          {demo ? 'Bengaluru, meet electric.' : 'Find charging near you.'}
        </Text>
        <Text style={{ color: '#C9D9C9', lineHeight: 21 }}>
          {demo
            ? 'Explore three fictional stations across two sample networks.'
            : 'Search public charging locations shared by connected operators.'}
        </Text>
      </View>
      <View style={s.row}>
        {[true, false].map((value) => (
          <Pressable
            key={String(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: demo === value }}
            onPress={() => {
              generation.current++;
              setDemo(value);
              setStations(value ? demoStations : []);
              setError('');
              setLoading(false);
            }}
            style={[s.chip, { flex: 1, alignItems: 'center' }, demo === value && s.selected]}
          >
            <Text style={[s.text, demo === value && s.selectedText]}>
              {value ? 'Sample stations' : 'Connected stations'}
            </Text>
          </Pressable>
        ))}
      </View>
      {demo ? (
        <Notice>Demo data · These stations and availability are fictional.</Notice>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={s.row}>
            <TextInput
              accessibilityLabel="Latitude"
              placeholder="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numbers-and-punctuation"
              style={[s.input, { flex: 1 }]}
            />
            <TextInput
              accessibilityLabel="Longitude"
              placeholder="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numbers-and-punctuation"
              style={[s.input, { flex: 1 }]}
            />
          </View>
          <Button title="Search within 25 km" disabled={loading} onPress={() => void search()} />
          <Button
            title="Use my location"
            secondary
            disabled={loading}
            onPress={() => void search(true)}
          />
        </View>
      )}
      <TextInput
        accessibilityLabel="Filter station results by name or network"
        style={s.input}
        placeholder="Search results by station or network"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {['All chargers', 'Available', '50+ kW'].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === value }}
            onPress={() => setFilter(value)}
            style={[s.chip, filter === value && s.selected]}
          >
            <Text style={[{ color: colors.ink, fontSize: 12 }, filter === value && s.selectedText]}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.row}>
        <Text style={s.h2}>Nearby charging</Text>
        <Text style={s.text}>{visible.length} locations</Text>
      </View>
      {loading && <Loading />}
      {!!error && <Notice>{error}</Notice>}
      {!loading && !error && !visible.length && (
        <View style={s.card}>
          <Text style={s.h2}>No stations to show yet</Text>
          <Text style={s.text}>
            {demo
              ? 'Try another search or filter.'
              : 'Run a search above. Results appear when operators are connected and their locations have been synced.'}
          </Text>
        </View>
      )}
      {!loading &&
        visible.map((station) => (
          <Pressable
            key={station.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${station.name}`}
            onPress={() => router.push({ pathname: '/station/[id]', params: { id: station.id } })}
            style={s.card}
          >
            <View style={s.row}>
              <Text style={s.eyebrow}>{station.provider_id}</Text>
              <Text style={s.badge}>
                {(station.available_connectors || 0) > 0
                  ? `${station.available_connectors} available`
                  : 'No availability'}
              </Text>
            </View>
            <Text style={s.h2}>{station.name}</Text>
            <Text style={s.text}>{station.address || station.city}</Text>
            <View
              style={[s.row, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }]}
            >
              <Text style={{ color: colors.ink, fontWeight: '600' }}>
                {station.max_power_kw || '—'} kW ·{' '}
                {(station.connector_standards || []).map(connectorLabel).join(' / ')}
              </Text>
              <Text style={s.text}>{((station.distance_meters || 0) / 1000).toFixed(1)} km →</Text>
            </View>
          </Pressable>
        ))}
      <Text style={[s.text, { fontSize: 11 }]}>
        Availability reflects the last provider sync and may change before arrival.
      </Text>
    </Page>
  );
}
