import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../components/ui';
export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Feather name="compass" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fastag"
        options={{
          title: 'FASTag',
          tabBarIcon: ({ color, size }) => <Feather name="credit-card" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: 'Networks',
          tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
