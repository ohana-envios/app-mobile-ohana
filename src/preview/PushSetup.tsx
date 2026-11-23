import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button } from './Controls';
import { styles } from './styles';
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string }) => Promise<T>;
type Response = { notification: { request: { content: { data?: Record<string, unknown> } } } };
export function PushSetup({ request, expiresAt, onToken, onOpen }: { request: Request; expiresAt: number; onToken: (token: string) => void; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState(''); const [revision, setRevision] = useState(0); const tokenCallback = useRef(onToken); const openCallback = useRef(onOpen); tokenCallback.current = onToken; openCallback.current = onOpen;
  useEffect(() => {
    let active = true; let subscription: { remove: () => void } | undefined;
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    if (Constants.appOwnership === 'expo') { setStatus('Las notificaciones con la app cerrada requieren una versión de desarrollo instalada.'); return; }
    if (typeof projectId !== 'string' || !/^[0-9a-f-]{36}$/i.test(projectId)) { setStatus('Las notificaciones del celular todavía no están configuradas.'); return; }
    async function initialize() {
      try {
        const notifications = await import('expo-notifications');
        if (!active) return;
        notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
        const navigate = (response: Response | null) => { const data = response?.notification.request.content.data; if (data?.type === 'reschedule-proposal' && typeof data.shipmentId === 'string' && data.shipmentId.length <= 128) { openCallback.current(data.shipmentId); notifications.clearLastNotificationResponse(); } };
        subscription = notifications.addNotificationResponseReceivedListener(navigate);
        navigate(notifications.getLastNotificationResponse());
        if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('default', { name: 'Propuestas', importance: notifications.AndroidImportance.DEFAULT });
        let permission = await notifications.getPermissionsAsync();
        if (!permission.granted) permission = await notifications.requestPermissionsAsync();
        if (!permission.granted) { if (active) setStatus('Permití las notificaciones del celular para recibir avisos con la app cerrada.'); return; }
        const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
        if (!active) return;
        await request('/api/shipments/push-devices', { signal: new AbortController().signal, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, expiresAt }) });
        if (!active) { try { await request('/api/shipments/push-devices/deactivate', { signal: AbortSignal.timeout(3000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); } catch { /* It also expires with the session. */ } return; }
        tokenCallback.current(token); setStatus('Notificaciones del celular activadas.');
      } catch { if (active) setStatus('No se pudieron activar las notificaciones del celular.'); }
    }
    void initialize();
    return () => { active = false; subscription?.remove(); };
  }, [request, expiresAt, revision]);
  return <View><Text style={styles.muted}>{status}</Text>{status.startsWith('No se pudieron') && <Button title="Reintentar notificaciones" onPress={() => setRevision((n) => n + 1)} />}</View>;
}
