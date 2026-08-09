import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, EmptyState, Skeleton } from '../../components/ui';
type Driver = { id: string; name: string; role: string; isActive: boolean; isOnline: boolean; currentLat: number | null; currentLng: number | null };
type Order = { id: string; orderNo: number; type: string; status: string; deliveryStatus: string | null; customerName: string; driver: { id: string; name: string } | null };
export function DispatchDashboard() {
  const qc = useQueryClient();
  const orders = useQuery({ queryKey: ['dispatch-orders'], queryFn: () => api<{ orders: Order[] }>('/orders/manage') });
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => api<{ staff: Driver[] }>('/staff') });
  const assign = useMutation({ mutationFn: ({ id, driverId }: { id: string; driverId: string }) => api(`/deliveries/${id}/assign`, { method: 'POST', body: { driverId } }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['dispatch-orders'] }) });
  if (orders.isLoading || staff.isLoading) return <Skeleton className="h-72" />;
  const rows = (orders.data?.orders ?? []).filter((o) => o.type === 'DELIVERY' && !['COMPLETED', 'CANCELLED'].includes(o.status));
  const drivers = (staff.data?.staff ?? []).filter((s) => s.role === 'DRIVER' && s.isActive && s.isOnline);
  const points = drivers.filter((d) => d.currentLat != null && d.currentLng != null);
  return <div className="space-y-5"><header><p className="label">Хүргэлтийн удирдлага</p><h1 className="mt-2 text-3xl">Жолооч оноох</h1></header>{points[0] && <iframe title="Online жолооч нарын газрын зураг" className="h-72 w-full border border-line" src={`https://www.openstreetmap.org/export/embed.html?bbox=${points[0].currentLng!-0.02}%2C${points[0].currentLat!-0.02}%2C${points[0].currentLng!+0.02}%2C${points[0].currentLat!+0.02}&marker=${points[0].currentLat}%2C${points[0].currentLng}`} />}{!rows.length ? <EmptyState title="Идэвхтэй хүргэлт алга" /> : rows.map((o) => <article key={o.id} className="flex flex-wrap items-center justify-between gap-4 border border-line p-5"><div><strong>#{o.orderNo} · {o.customerName}</strong><p className="text-sm text-muted">{o.deliveryStatus ?? o.status} · {o.driver?.name ?? 'Жолооч оноогоогүй'}</p></div><div className="flex gap-2">{drivers.map((d) => <Button key={d.id} size="sm" variant={o.driver?.id === d.id ? 'primary' : 'secondary'} onClick={() => assign.mutate({ id: o.id, driverId: d.id })}>{d.name}</Button>)}</div></article>)}</div>;
}
