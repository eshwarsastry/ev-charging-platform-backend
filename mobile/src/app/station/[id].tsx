import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { connectorLabel, messageOf, request, type Station } from '../../lib/api';
import { demoStations } from '../../lib/demo';
import { Button, Loading, Notice, Page, s } from '../../components/ui';
export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [liveStation, setStation] = useState<Station>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const demo = id?.startsWith('demo-');
  const station = demo
    ? demoStations.find((item) => item.id === id)
    : liveStation?.id === id
      ? liveStation
      : undefined;
  useEffect(() => {
    let active = true;
    if (!demo)
      request<{ data: Station }>(`/v1/stations/${encodeURIComponent(id)}/detail`)
        .then((result) => {
          if (active) setStation(result.data);
        })
        .catch((e) => {
          if (active) setError(messageOf(e));
        });
    return () => {
      active = false;
    };
  }, [id, demo, attempt]);
  return (
    <Page>
      <Button
        title="← Back to discovery"
        secondary
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      {!!error && (
        <>
          <Notice>{error}</Notice>
          <Button
            title="Try again"
            onPress={() => {
              setError('');
              setAttempt(attempt + 1);
            }}
          />
        </>
      )}
      {!station && !error && <Loading />}
      {station && (
        <>
          <Text style={s.eyebrow}>{station.provider_id}</Text>
          <Text style={s.title}>{station.name}</Text>
          <Text style={s.text}>
            {station.address}, {station.city}
          </Text>
          {demo && <Notice>Fictional demo station. Directions and charging are disabled.</Notice>}
          <View style={s.card}>
            <Text style={s.h2}>Connectors</Text>
            {station.connectors?.map((connector) => (
              <View key={connector.id} style={s.row}>
                <View>
                  <Text style={s.h2}>{connectorLabel(connector.standard)}</Text>
                  <Text style={s.text}>{connector.power_kw || 'Unknown'} kW</Text>
                </View>
                <Text style={s.badge}>{connector.status}</Text>
              </View>
            ))}
            {!station.connectors?.length && (
              <Text style={s.text}>Connector details have not been provided.</Text>
            )}
          </View>
          <Text style={s.text}>
            {station.updated_at
              ? `Last synced ${new Date(station.updated_at).toLocaleString()}`
              : 'Sample availability'}{' '}
            · Check availability before arrival.
          </Text>
          <Button
            title="Open directions"
            disabled={demo}
            onPress={() => {
              void Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`,
              ).catch((e) => setError(messageOf(e)));
            }}
          />
          <Notice>
            Starting a charger and paying with FASTag will be available after operator and bank
            onboarding. No charging session is started from this screen.
          </Notice>
          <Button
            title="Explore the FASTag demo"
            secondary
            onPress={() => router.push('/fastag')}
          />
        </>
      )}
    </Page>
  );
}
