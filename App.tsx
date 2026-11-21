import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { colors, fonts } from './src/theme';
import { AuthenticatedApp } from './src/AuthenticatedApp';

export default function App() {
  const [preview, setPreview] = useState(false);
  const [administration, setAdministration] = useState(false);
  const [loaded, fontError] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  if (!loaded && !fontError) return <SafeAreaView style={styles.safe} />;
  if (administration) return <AuthenticatedApp onExit={() => setAdministration(false)} />;
  if (__DEV__ && preview) {
    // Metro removes this development-only branch and its fixtures in release builds.
    const { PreviewApp } = require('./src/preview/PreviewApp') as typeof import('./src/preview/PreviewApp');
    return <PreviewApp onExit={() => setPreview(false)} />;
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" />
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
  previewButton: { minHeight: 52, padding: 16, backgroundColor: colors.surface, borderRadius: 16, marginBottom: 20 },
  previewButtonText: { color: colors.brand, fontSize: 16, fontFamily: fonts.bold },
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  brandMark: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandLetter: { color: '#fff', fontSize: 23, fontFamily: fonts.heading },
  brand: { color: colors.text, fontSize: 18, fontFamily: fonts.heading, lineHeight: 20 },
  brandSub: { color: colors.muted, fontSize: 9, fontFamily: fonts.bold, letterSpacing: 2 },
  content: { padding: 24, gap: 12, width: '100%', maxWidth: 620, alignSelf: 'center' },
  primaryButton: { minHeight: 52, padding: 16, backgroundColor: colors.brand, borderRadius: 16, justifyContent: 'center' },
  primaryText: { color: colors.surface, fontSize: 16, fontFamily: fonts.bold },
  heading: { color: colors.text, fontSize: 28, fontFamily: fonts.heading, marginBottom: 8 },
  intro: { fontFamily: fonts.regular, color: colors.muted, fontSize: 15, marginBottom: 22 },
});
