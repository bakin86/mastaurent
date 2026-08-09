import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button, Input, Skeleton } from '../../components/ui';
import type { Role } from '../../lib/types';
type Staff = { id: string; name: string; email: string; phone: string | null; role: Role; isActive: boolean };
export function StaffManagement() {
  const [email, setEmail] = useState(''); const [role, setRole] = useState<'MANAGER'|'KITCHEN'|'DRIVER'>('KITCHEN'); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['staff'], queryFn: () => api<{ staff: Staff[] }>('/staff') });
  const save = useMutation({ mutationFn: (body: unknown) => api('/staff', { method: 'POST', body }), onSuccess: () => { setEmail(''); void qc.invalidateQueries({ queryKey: ['staff'] }); } });
  const patch = useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => api(`/staff/${id}`, { method: 'PATCH', body }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }) });
  if (q.isLoading) return <Skeleton className="h-72" />;
  return <div className="space-y-7"><header><p className="label">Захирал</p><h1 className="mt-2 text-3xl">Ажилтны удирдлага</h1></header>
    <form className="grid gap-3 border border-line bg-paper p-5 sm:grid-cols-[1fr_180px_auto]" onSubmit={(e) => { e.preventDefault(); save.mutate({ email, role }); }}><label className="label">Бүртгэлтэй и-мэйл<Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} required/></label><label className="label">Role<select className="mt-2 w-full border border-line bg-bg p-3" value={role} onChange={(e) => setRole(e.target.value as typeof role)}><option>MANAGER</option><option>KITCHEN</option><option>DRIVER</option></select></label><Button className="self-end" type="submit">Нэмэх</Button></form>
    <div className="space-y-2">{q.data?.staff.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border border-line p-4"><div><strong>{s.name}</strong><p className="text-sm text-muted">{s.email} · {s.role}</p></div>{s.role !== 'DIRECTOR' && <Button variant="ghost" onClick={() => patch.mutate({ id: s.id, body: { isActive: !s.isActive } })}>{s.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</Button>}</div>)}</div>
  </div>;
}
