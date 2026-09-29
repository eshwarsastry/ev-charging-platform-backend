import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { API_URL, messageOf, request, type Provider } from '../../lib/api';
import { Button, colors, Loading, Notice, Page, s } from '../../components/ui';
export default function Networks() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(Boolean(API_URL));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!API_URL) return;

    request<{ data: Provider[] }>('/v1/providers')
      .then((value) => {
        if (active) setProviders(value.data);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <Page>
      <Text style={s.eyebrow}>More choice. One place.</Text>
      <Text style={s.title}>Your charging{'\n'}networks.</Text>
      <Text style={s.text}>
        See which operators are configured to share charging locations with OHMCharge.
      </Text>
      <View style={s.card}>
        <Feather name="globe" size={32} color={colors.green} />
        <Text style={s.h2}>Built to bring networks together</Text>
        <Text style={s.text}>
          Coverage grows as operators connect. We only show locations they share; no single feed
          guarantees every charger in India.
        </Text>
      </View>
      {!API_URL && (
        <Notice>No backend connected. Sample stations are available in Discover.</Notice>
      )}
      {busy && <Loading />}
      {!!error && <Notice>{error}</Notice>}
      {providers.map((provider) => (
        <View key={provider.id} style={s.card}>
          <View style={s.row}>
            <Text style={s.h2}>{provider.displayName}</Text>
            <Text style={s.badge}>{provider.configured ? 'Configured' : 'Not connected'}</Text>
          </View>
          <Text style={s.text}>
            {provider.configured
              ? 'Configured for location sync. Availability depends on the latest successful import.'
              : 'Waiting for the operator integration.'}
          </Text>
        </View>
      ))}
      {!!API_URL && (
        <Button
          title="Refresh networks"
          secondary
          disabled={busy}
          onPress={() => {
            setError('');
            setBusy(true);
            setAttempt(attempt + 1);
          }}
        />
      )}
      <Text style={s.h2}>Before you charge</Text>
      <Text style={s.text}>
        A listed location does not imply remote start or FASTag acceptance. Those features require
        separate operator and bank agreements.
      </Text>
    </Page>
  );
}
