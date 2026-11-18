import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import { CustomersScreen } from './CustomersScreen';
import { UsersScreen } from './UsersScreen';
import { createPreviewCustomersSource } from './customers/preview-source';
import { createPreviewUsersSource } from './users/preview-source';
import { Button } from './Controls';
import { palette, styles as s } from './styles';

export function PreviewApp({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<'customers' | 'users'>('customers');
  const [source] = useState(createPreviewCustomersSource);
  const [usersSource] = useState(createPreviewUsersSource);
  if (!__DEV__) return null;
  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView key={tab} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={s.header}><Text style={s.logo}>O</Text><View><Text style={s.heading}>Ohana Envíos</Text><Text style={s.subtitle}>SCRUM-20 · SCRUM-21</Text></View></View>
        <View style={s.banner}><Text style={s.heading}>Vista previa · Datos ficticios</Text><Text style={s.text}>Simulación administrativa. Los cambios duran hasta reiniciar esta vista y no se conectan a servicios reales.</Text></View>
        {tab === 'customers' ? <CustomersScreen source={source} preview /> : <UsersScreen source={usersSource} preview />}
        <Button title="Salir de la vista previa" onPress={onExit} />
      </ScrollView>
    </KeyboardAvoidingView>
    <View accessibilityRole="tablist" style={s.nav}>
      {(['customers', 'users'] as const).map((item) => <Pressable key={item} accessibilityRole="tab"
        accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)}
        style={[s.navTab, tab === item && { backgroundColor: 'white' }]}>
        <Text style={[s.navText, tab === item && { color: palette.brand }]}>{item === 'customers' ? 'Clientes' : 'Control · Usuarios'}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}
