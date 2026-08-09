import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, EmptyState, Skeleton } from '../../components/ui';

type Delivery = { id: string; orderNo: number; customerName: string; customerPhone: string; district: string | null; addressLine: string | null; deliveryStatus: string; tenant: { name: string; address: string | null; phone: string | null } };
export function DriverDashboard() {
  const [online, setOnline] = useState(false);
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ['deliveries-mine'], queryFn: () => api<{ orders: Delivery[] }>('/deliveries/mine') });
  const available = useQuery({ queryKey: ['deliveries-available'], queryFn: () => api<{ orders: Delivery[] }>('/deliveries/available') });
  const act = useMutation({ mutationFn: async ({ path, body }: { path: string; body?: unknown }) => {
    if (body && navigator.geolocation) {
      const p = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }));
      body = { ...(body as object), latitude: p.coords.latitude, longitude: p.coords.longitude };
    }
    return api(path, { method: body ? 'PATCH' : 'POST', body });
  }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['deliveries-mine'] }); void qc.invalidateQueries({ queryKey: ['deliveries-available'] }); } });
  const presence = useMutation({ mutationFn: (isOnline: boolean) => api('/locations/online', { method: 'PATCH', body: { isOnline } }), onSuccess: (_d, value) => setOnline(value) });
  useEffect(() => {
    if (!online || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((pos) => {
      const active = mine.data?.orders.find((o) => !['DELIVERED'].includes(o.deliveryStatus));
      void api('/locations/ping', { method: 'POST', body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, orderId: active?.id } });
    }, undefined, { enableHighAccuracy: true, maximumAge: 3000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [online, mine.data]);
  if (mine.isLoading || available.isLoading) return <Skeleton className="h-72" />;
  const next: Record<string, [string, string]> = { READY_FOR_DELIVERY: ['PICKED_UP', 'Захиалгыг авсан'], PICKED_UP: ['ON_THE_WAY', 'Хүргэлтэд гарсан'], ON_THE_WAY: ['DELIVERED', 'Хүргэж дууссан'] };
  return <div className="space-y-8"><header><p className="label">Жолооч</p><h1 className="mt-2 text-3xl">Миний хүргэлтүүд</h1><div className="mt-3 flex items-center gap-3"><Button variant={online ? 'primary' : 'secondary'} onClick={() => presence.mutate(!online)}>{online ? 'ONLINE — байршил дамжиж байна' : 'OFFLINE'}</Button><span className="text-sm text-muted">Өнөөдөр: {mine.data?.orders.length ?? 0}</span></div></header>
    <section className="space-y-3">{(mine.data?.orders ?? []).map((o) => <DeliveryCard key={o.id} order={o} action={next[o.deliveryStatus] ? () => act.mutate({ path: `/deliveries/${o.id}/status`, body: { status: next[o.deliveryStatus][0] } }) : undefined} label={next[o.deliveryStatus]?.[1]} />)}</section>
    <section><h2 className="mb-3 text-xl">Хүлээгдэж буй хүргэлт</h2>{!(available.data?.orders.length) ? <EmptyState title="Хүлээгдэж буй хүргэлт алга" /> : <div className="space-y-3">{available.data.orders.map((o) => <DeliveryCard key={o.id} order={o} label="Хүргэлтийг авах" action={() => act.mutate({ path: `/deliveries/${o.id}/claim` })} />)}</div>}</section>
  </div>;
}
function DeliveryCard({ order: o, action, label }: { order: Delivery; action?: () => void; label?: string }) { return <article className="border border-line bg-paper p-5"><div className="flex justify-between"><strong>#{o.orderNo} · {o.customerName}</strong><span className="label">{o.deliveryStatus}</span></div><p className="mt-3 text-sm">Ресторан: {o.tenant.name}, {o.tenant.address ?? 'хаяггүй'}</p><p className="text-sm">Хүргэх: {o.district} {o.addressLine}</p><a className="mt-2 block text-sm underline" href={`tel:${o.customerPhone}`}>{o.customerPhone}</a>{action && <Button className="mt-4" onClick={action}>{label}</Button>}</article>; }
