import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareReceipt(api: string, session: { accessToken: string; expiresAt: number }, id: string) {
  if (Date.now() >= session.expiresAt || !FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('No se puede abrir el comprobante');
  const temporary = `${FileSystem.cacheDirectory}ohana-receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let named = '';
  try {
    const result = await FileSystem.downloadAsync(`${api}/api/shipments/${encodeURIComponent(id)}/receipt`, temporary, { headers: { Authorization: `Bearer ${session.accessToken}` } });
    if (result.status !== 200) throw new Error('No se pudo descargar');
    const mediaType = Object.entries(result.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1]?.split(';')[0];
    const extension = mediaType === 'application/pdf' ? 'pdf' : mediaType === 'image/png' ? 'png' : mediaType === 'image/jpeg' ? 'jpg' : '';
    if (!extension) throw new Error('Formato no admitido');
    named = `${temporary}.${extension}`;
    await FileSystem.moveAsync({ from: temporary, to: named });
    await Sharing.shareAsync(named, { mimeType: mediaType, dialogTitle: 'Comprobante de pago' });
  } finally {
    await FileSystem.deleteAsync(temporary, { idempotent: true });
    if (named) await FileSystem.deleteAsync(named, { idempotent: true });
  }
}
