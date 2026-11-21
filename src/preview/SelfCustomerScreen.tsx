import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { createSelfCustomerSource } from './api-sources';
import { createAuthenticatedTransport } from '../authenticated-transport';
import { CustomerRecord } from './CustomersScreen';
import { Button } from './Controls';
import { styles } from './styles';
import { ShipmentScreen } from './ShipmentScreen';
import { ShipmentList } from './ShipmentList';
import { shareReceipt } from '../receipt-download';
export function SelfCustomerScreen({ api, session, onExit }: { api: string; session: { accessToken: string; expiresAt: number; name: string }; onExit: () => void }) {
  const request = useMemo(() => createAuthenticatedTransport(api, session), [api, session]);
  const source = useMemo(() => createSelfCustomerSource(request), [request]);
  const [open, setOpen] = useState(false); const [id, setId] = useState<string | null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  const [shipment, setShipment] = useState(false);
  const [listing, setListing] = useState(false);
  useEffect(() => { if (!open) return; const controller = new AbortController(); setError(false); setId(null);
    source.get('', controller.signal).then(customer => { if (!controller.signal.aborted) setId(customer.id); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [source, open, retry]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.heading}>Hola, {session.name}</Text>
    {listing ? <><Button title="Volver" onPress={() => setListing(false)} /><ShipmentList request={request} downloadReceipt={(id) => shareReceipt(api, session, id)} own /></> : shipment ? <><Button title="Volver" onPress={() => setShipment(false)} /><ShipmentScreen source={source} request={request} own /></> : open ? id ? <CustomerRecord id={id} source={source} preview={false} backLabel="Volver a mi cuenta" onBack={() => setOpen(false)} /> : <View style={styles.card}><Text accessibilityRole={error ? 'alert' : undefined} style={styles.text}>{error ? 'No se pudo cargar tu ficha.' : 'Cargando tu ficha…'}</Text>{error && <Button title="Reintentar" onPress={() => setRetry(n => n + 1)} />}<Button title="Volver" onPress={() => setOpen(false)} /></View> : <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Tu cuenta</Text>
      <Button primary title="Nuevo envío" onPress={() => setShipment(true)} />
      <Button title="Mis envíos" onPress={() => setListing(true)} />
      <Button title="Mis datos y direcciones" onPress={() => setOpen(true)} /></View>}
    <Button title="Salir" onPress={onExit} />
  </ScrollView></SafeAreaView>;
}
