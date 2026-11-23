import { useState } from 'react';
import { Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button } from './Controls';
import { styles } from './styles';
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
export function DeliveryEvidence({ id, request }: { id: string; request: Request }) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function share() { let path = ''; setBusy(true); setMessage(''); try { if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('Unavailable'); const file = await request<{ mediaType: string; data: string }>(`/api/shipments/${encodeURIComponent(id)}/delivery/evidence`, { signal: new AbortController().signal }); const extension = ({ 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' } as Record<string, string>)[file.mediaType]; if (!extension) throw new Error('invalid'); path = `${FileSystem.cacheDirectory}ohana-entrega-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`; await FileSystem.writeAsStringAsync(path, file.data, { encoding: FileSystem.EncodingType.Base64 }); await Sharing.shareAsync(path, { mimeType: file.mediaType, dialogTitle: 'Evidencia de entrega' }); } catch (reason) { setMessage(typeof reason === 'object' && reason !== null && 'status' in reason && reason.status === 404 ? 'No hay evidencia de entrega disponible.' : 'No se pudo recuperar la evidencia.'); } finally { if (path) await FileSystem.deleteAsync(path, { idempotent: true }); setBusy(false); } }
  return <View><Button title="Abrir evidencia de entrega" disabled={busy} onPress={() => void share()} />{message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}</View>;
}
