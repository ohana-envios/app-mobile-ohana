import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors } from './src/theme';
import { AuthenticatedApp } from './src/AuthenticatedApp';

export default function App() {
  const [preview, setPreview] = useState(false);
  const [administration, setAdministration] = useState(false);
  if (administration) return <AuthenticatedApp onExit={() => setAdministration(false)} />;
  if (__DEV__ && preview) {
    // Metro removes this development-only branch and its fixtures in release builds.
    const { PreviewApp } = require('./src/preview/PreviewApp') as typeof import('./src/preview/PreviewApp');
    return <PreviewApp onExit={() => setPreview(false)} />;
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={styles.header}>
      <View style={styles.brandMark}><Text style={styles.brandLetter}>O</Text></View>
      <View><Text style={styles.brand}>Ohana</Text><Text style={styles.brandSub}>ENVÍOS</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>Ingresá a Ohana</Text>
      <Text style={styles.intro}>Accedé a tus envíos o solicitá el alta con tu cuenta.</Text>
      <Pressable accessibilityRole="button" onPress={() => setAdministration(true)} style={styles.primaryButton}>
        <Text style={styles.primaryText}>Continuar</Text>
      </Pressable>
      {__DEV__ && <Pressable accessibilityRole="button" onPress={() => setPreview(true)} style={styles.previewButton}>
        <Text style={styles.previewButtonText}>Probar Clientes y Usuarios · Datos ficticios</Text>
      </Pressable>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  previewButton: { minHeight: 52, padding: 16, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 20 },
  previewButtonText: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  brandMark: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandLetter: { color: '#fff', fontSize: 23, fontWeight: '900' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
  brandSub: { color: '#b8d8eb', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  content: { padding: 24, gap: 12, width: '100%', maxWidth: 620, alignSelf: 'center' },
  primaryButton: { minHeight: 52, padding: 16, backgroundColor: colors.orange, borderRadius: 12, justifyContent: 'center' },
  primaryText: { color: '#222b34', fontSize: 16, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  intro: { color: colors.muted, fontSize: 15, marginBottom: 22 },
});
