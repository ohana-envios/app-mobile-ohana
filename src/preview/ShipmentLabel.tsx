import { useState } from 'react';
import { Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button } from './Controls';
import { styles } from './styles';
import { labelHtml, type LabelData } from './shipments/label';
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
export function ShipmentLabel({ id, request }: { id: string; request: Request }) {
  const [data, setData] = useState<LabelData | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function preview() { setBusy(true); setError(''); try { const result = await request<LabelData>(`/api/shipments/${encodeURIComponent(id)}/label`, { signal: new AbortController().signal }); labelHtml(result); setData(result); } catch { setData(null); setError('No se pudo obtener la etiqueta. Intentá de nuevo.'); } finally { setBusy(false); } }
  async function share() { if (!data) return; let path = ''; setError(''); try { if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('Unavailable'); path = `${FileSystem.cacheDirectory}etiqueta-ohana-${Date.now()}.html`; await FileSystem.writeAsStringAsync(path, labelHtml(data), { encoding: FileSystem.EncodingType.UTF8 }); await Sharing.shareAsync(path, { mimeType: 'text/html', dialogTitle: 'Etiqueta para imprimir' }); } catch { setError('No se pudo compartir la etiqueta.'); } finally { if (path) await FileSystem.deleteAsync(path, { idempotent: true }); } }
  return <View><Button title={busy ? 'Cargando…' : data ? 'Actualizar etiqueta' : 'Ver etiqueta'} disabled={busy} onPress={() => void preview()} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{data && <View><Text accessibilityRole="header" style={styles.heading}>Vista previa de etiqueta</Text><Text style={styles.text}>{data.code} · {data.packageCount} {data.packageCount === 1 ? 'bulto' : 'bultos'}</Text><Text style={styles.text}>Destinatario: {data.recipientName}</Text><Text style={styles.text}>Entrega: {data.street} {data.number}, {data.locality}, {data.department}</Text><Text style={styles.text}>Se generará una etiqueta por bulto con el mismo código.</Text><Button title="Compartir etiquetas para imprimir" onPress={() => void share()} /></View>}</View>;
}
