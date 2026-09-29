import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';
import { API_URL, messageOf, request, type Capabilities, type Receipt } from '../../lib/api';
import { Button, colors, Loading, Notice, Page, s } from '../../components/ui';
export default function Fastag() {
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [scenario, setScenario] = useState<'active' | 'low-balance' | 'blacklisted'>('active');
  const [receipt, setReceipt] = useState<Receipt>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (API_URL)
      request<Capabilities>('/v1/sandbox/capabilities')
        .then((value) => {
          if (active) setCapabilities(value);
        })
        .catch((e) => {
          if (active) setError(messageOf(e));
        });
    return () => {
      active = false;
    };
  }, [attempt]);
  async function simulate() {
    setBusy(true);
    setError('');
    setReceipt(undefined);
    try {
      setReceipt(
        await request<Receipt>('/v1/sandbox/fastag/demo', {
          requestId: Crypto.randomUUID(),
          scenario,
        }),
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Text style={s.eyebrow}>One tag. A simpler stop.</Text>
      <Text style={s.title}>Meet FASTag{'\n'}for charging.</Text>
      <Text style={s.text}>
        Explore how a charging payment could feel once your network and bank are connected.
      </Text>
      <View style={{ backgroundColor: colors.ink, padding: 26, borderRadius: 24, gap: 30 }}>
        <View style={s.row}>
          <Text style={{ color: colors.lime, fontWeight: '800', fontSize: 24 }}>FASTag</Text>
          <Feather name="wifi" size={30} color={colors.lime} />
        </View>
        <Text style={{ color: 'white', fontSize: 21 }}>Your vehicle. Your tag.</Text>
        <Text style={{ color: '#C9D9C9', letterSpacing: 3 }}>DEMONSTRATION ONLY</Text>
      </View>
      <Notice>
        Sandbox only. No real FASTag is read, no charger is started, and no funds are moved.
      </Notice>
      <View style={s.card}>
        <Text style={s.h2}>A sample charging stop</Text>
        <View style={s.row}>
          <Text style={s.text}>Energy</Text>
          <Text style={s.h2}>12 kWh</Text>
        </View>
        <View style={s.row}>
          <Text style={s.text}>Illustrative rate</Text>
          <Text style={s.text}>₹20 / kWh</Text>
        </View>
        <View style={s.row}>
          <Text style={s.text}>Demo total</Text>
          <Text style={s.title}>₹240</Text>
        </View>
      </View>
      <Text style={s.h2}>Try a tag response</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['active', 'low-balance', 'blacklisted'] as const).map((value) => (
          <Pressable
            key={value}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ selected: scenario === value }}
            style={[s.chip, scenario === value && s.selected]}
            onPress={() => {
              setScenario(value);
              setReceipt(undefined);
            }}
          >
            <Text style={[s.text, scenario === value && s.selectedText]}>
              {value.replace('-', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      {!API_URL && (
        <Notice>
          Connect the backend to run a payment simulation. The screens can be explored without a
          connection.
        </Notice>
      )}
      {!!API_URL && !capabilities?.paymentSandbox && !error && (
        <Notice>The backend payment sandbox is not enabled.</Notice>
      )}
      {!!error && (
        <>
          <Notice>{error}</Notice>
          <Button
            title="Check connection again"
            secondary
            onPress={() => {
              setError('');
              setCapabilities(undefined);
              setAttempt(attempt + 1);
            }}
          />
        </>
      )}
      <Button
        title={busy ? 'Running simulation…' : 'Simulate FASTag payment'}
        disabled={busy || !capabilities?.paymentSandbox}
        onPress={() => void simulate()}
      />
      {busy && <Loading />}
      {receipt && (
        <View style={s.card}>
          <Text style={s.badge}>SIMULATED RECEIPT</Text>
          <Text style={s.h2}>
            {receipt.status === 'CAPTURED' ? 'Demo payment complete' : 'Demo payment declined'}
          </Text>
          <Text style={s.text}>{receipt.message}</Text>
          <Text style={s.text}>Tag: {receipt.tagStatus}</Text>
          {receipt.reference && (
            <Text selectable style={[s.text, { fontSize: 11 }]}>
              {receipt.reference}
            </Text>
          )}
        </View>
      )}
    </Page>
  );
}
