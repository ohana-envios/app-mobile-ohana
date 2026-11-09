import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from './src/components/EmptyState';
import { colors } from './src/theme';

type Tab = 'Inicio' | 'Envíos' | 'Perfil';
const tabs: Tab[] = ['Inicio', 'Envíos', 'Perfil'];

export default function App() {
  const [tab, setTab] = useState<Tab>('Inicio');

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={styles.header}>
      <View style={styles.brandMark}><Text style={styles.brandLetter}>O</Text></View>
      <View><Text style={styles.brand}>Ohana</Text><Text style={styles.brandSub}>ENVÍOS</Text></View>
      <View style={styles.headerSpacer} />
      <Text style={styles.headerTag}>BASE MÓVIL</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {tab === 'Inicio' && <Home />}
      {tab === 'Envíos' && <Section title="Mis envíos" description="Aquí aparecerán los envíos reales cuando la API incorpore el listado y seguimiento." />}
      {tab === 'Perfil' && <Section title="Mi perfil" description="Este espacio recibirá los datos de la sesión cuando se integre Auth0 en la app móvil." />}
    </ScrollView>
    <View style={styles.tabBar} accessibilityRole="tablist">
      {tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}
    </View>
  </SafeAreaView>;
}

function Home() {
  return <>
    <Text style={styles.eyebrow}>OPERACIÓN DIARIA</Text>
    <Text style={styles.heading}>Bienvenido a Ohana</Text>
    <Text style={styles.intro}>La gestión de tus envíos, desde cualquier lugar.</Text>
    <View style={styles.hero}><Text style={styles.heroEyebrow}>SIEMPRE EN MOVIMIENTO</Text><Text style={styles.heroTitle}>Cada entrega cuenta.</Text><Text style={styles.heroText}>Esta base está lista para conectar los flujos de la app con la API de Ohana.</Text></View>
    <Text style={styles.sectionTitle}>Resumen</Text>
    <View style={styles.metrics}><Metric label="Envíos activos" /><Metric label="Entregas de hoy" /></View>
    <View style={styles.card}><EmptyState title="Sin envíos para mostrar" description="Los datos aparecerán cuando estén disponibles los casos de uso de la API." /></View>
  </>;
}

function Metric({ label }: { label: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>—</Text><Text style={styles.metricNote}>Sin datos aún</Text></View>;
}

function Section({ title, description }: { title: string; description: string }) {
  return <><Text style={styles.eyebrow}>OHANA ENVÍOS</Text><Text style={styles.heading}>{title}</Text><View style={styles.card}><EmptyState title="Próxima implementación" description={description} /></View></>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  brandMark: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandLetter: { color: '#fff', fontSize: 23, fontWeight: '900' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
  brandSub: { color: '#b8d8eb', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  headerSpacer: { flex: 1 },
  headerTag: { color: '#b8d8eb', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  content: { padding: 22, paddingBottom: 36 },
  eyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 2, fontWeight: '800', marginBottom: 8 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  intro: { color: colors.muted, fontSize: 15, marginBottom: 22 },
  hero: { backgroundColor: colors.blue, borderRadius: 18, padding: 26, marginBottom: 28 },
  heroEyebrow: { color: '#a8d4eb', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 9, marginBottom: 8 },
  heroText: { color: '#d8ecf6', fontSize: 14, lineHeight: 21 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: 14 },
  metrics: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metric: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  metricLabel: { color: colors.muted, fontSize: 12 },
  metricValue: { color: colors.blue, fontSize: 27, fontWeight: '800', marginVertical: 6 },
  metricNote: { color: '#91a2ae', fontSize: 11 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, marginTop: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10 },
  tabActive: { backgroundColor: '#eaf3f9' },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: colors.blue },
});
