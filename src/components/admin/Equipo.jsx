import React, { useMemo, useState } from 'react'
import {
  Users, Shield, UserCheck, PlusCircle, Pencil, Trash2,
} from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Modal, ConfirmDialog,
  PageHeader, StatCard, Toggle, EmptyState, Tabs,
} from '../ui'
import { toastOk, toastErr } from '../../lib/notify'
import {
  getCurrentUser, addUser, updateUser, deleteUser, getRoles, saveRole, logAudit,
} from '../../lib/storage'

const ROLE_TONE = { admin: 'night', supervisor: 'gold', cajero: 'blue', mesero: 'brand', cocinero: 'amber', repartidor: 'purple' }
const ROLE_LABEL = { admin: 'Admin', supervisor: 'Supervisor', cajero: 'Cajero', mesero: 'Mesero', cocinero: 'Cocinero', repartidor: 'Repartidor' }
const MODULE_PERMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pos', label: 'POS' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'tables', label: 'Mesas' },
  { id: 'kitchen', label: 'Cocina' },
  { id: 'delivery', label: 'Domicilios' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'clients', label: 'Clientes' },
  { id: 'cash', label: 'Caja' },
  { id: 'reports', label: 'Reportes' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'team', label: 'Equipo' },
  { id: 'settings', label: 'Configuración' },
]
const EDITABLE_ROLES = ['admin', 'supervisor', 'cajero']

const emptyForm = () => ({ name: '', role: 'cajero', password: '1234', active: true })

function UserFormModal({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    role: initial.role || 'cajero',
    password: initial.password || '',
    active: initial.active !== false,
  } : emptyForm())
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = () => {
    if (!form.name.trim()) { toastErr('Escribe el nombre'); return }
    if (!form.password.trim()) { toastErr('Escribe la contraseña'); return }
    onSubmit({
      name: form.name.trim(),
      role: form.role,
      password: form.password,
      active: form.active !== false,
    })
  }
  return (
    <Modal open onClose={onClose} title={initial ? `Editar ${initial.name}` : 'Nuevo usuario'}>
      <div className="space-y-4">
        <Field label="Nombre">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nombre del usuario" />
        </Field>
        <Field label="Rol">
          <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
            {Object.keys(ROLE_LABEL).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Contraseña">
          <Input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="PIN o contraseña" />
        </Field>
        {initial && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-night font-medium">Usuario activo</span>
            <Toggle checked={form.active} onChange={(v) => set('active', v)} />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={save}>{initial ? 'Guardar' : 'Crear usuario'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Equipo({ state, refresh, onNav }) {
  const me = getCurrentUser()
  const users = state.users || []
  const roles = getRoles()
  const [tab, setTab] = useState('usuarios')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [roleId, setRoleId] = useState('admin')
  const [permDraft, setPermDraft] = useState(() => {
    const r = roles.admin
    const perms = r?.permissions || []
    if (perms.includes('*')) return MODULE_PERMS.map((m) => m.id)
    return perms.filter((p) => MODULE_PERMS.some((m) => m.id === p))
  })

  const activos = users.filter((u) => u.active !== false).length
  const roleCount = Object.keys(roles || {}).length

  const selectRole = (id) => {
    setRoleId(id)
    const r = roles[id]
    const perms = r?.permissions || []
    if (perms.includes('*')) setPermDraft(MODULE_PERMS.map((m) => m.id))
    else setPermDraft(perms.filter((p) => MODULE_PERMS.some((m) => m.id === p)))
  }

  const togglePerm = (id) => {
    setPermDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const savePerms = () => {
    const next = roleId === 'admin' ? ['*', ...permDraft] : permDraft
    saveRole(roleId, next)
    logAudit({ user: me, action: 'role.update', detail: `Permisos de ${ROLE_LABEL[roleId] || roleId} actualizados` })
    toastOk('Permisos guardados')
    refresh()
  }

  const onCreate = (data) => {
    addUser(data)
    logAudit({ user: me, action: 'user.create', detail: `Usuario ${data.name} creado` })
    toastOk('Usuario creado')
    setFormOpen(false)
    refresh()
  }

  const onUpdate = (data) => {
    updateUser(editTarget.id, data)
    logAudit({ user: me, action: 'user.update', detail: `Usuario ${data.name} actualizado`, before: editTarget, after: data })
    toastOk('Usuario actualizado')
    setEditTarget(null)
    refresh()
  }

  const toggleActive = (u) => {
    if (u.id === me?.id && u.active !== false) {
      toastErr('No puedes desactivar tu propia cuenta')
      return
    }
    updateUser(u.id, { active: u.active === false })
    toastOk(u.active === false ? `${u.name} activado` : `${u.name} desactivado`)
    refresh()
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.id === me?.id) {
      toastErr('No puedes eliminar al administrador actual')
      setDeleteTarget(null)
      return
    }
    deleteUser(deleteTarget.id)
    logAudit({ user: me, action: 'user.delete', detail: `Usuario ${deleteTarget.name} eliminado` })
    toastOk('Usuario eliminado')
    setDeleteTarget(null)
    refresh()
  }

  const roleItems = useMemo(() => EDITABLE_ROLES.map((id) => ({
    id,
    label: ROLE_LABEL[id] || roles[id]?.label || id,
  })), [roles])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipo"
        subtitle="Usuarios, roles y permisos del sistema"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <span className="inline-flex items-center gap-1.5"><PlusCircle size={16} /> Nuevo usuario</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Users} label="Usuarios" value={users.length} sub="Registrados" tone="brand" />
        <StatCard icon={Shield} label="Roles" value={roleCount} sub="Definidos" tone="gold" />
        <StatCard icon={UserCheck} label="Activos" value={activos} sub={`de ${users.length}`} tone="blue" />
      </div>

      <Tabs
        items={[
          { id: 'usuarios', label: 'Usuarios' },
          { id: 'permisos', label: 'Permisos por rol' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'usuarios' && (
        <Card className="overflow-hidden">
          {users.length === 0 ? (
            <EmptyState icon="👥" title="Sin usuarios" message="Crea el primer usuario del equipo." action={<Button onClick={() => setFormOpen(true)}>Nuevo usuario</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Activo</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/70 hover:bg-page/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-night">{u.name}</div>
                        {u.id === me?.id && <span className="text-[11px] text-muted">Sesión actual</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ROLE_TONE[u.role] || 'muted'}>{ROLE_LABEL[u.role] || u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle checked={u.active !== false} onChange={() => toggleActive(u)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" className="!px-2.5 !py-1.5" onClick={() => setEditTarget(u)} title="Editar">
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            className="!px-2.5 !py-1.5 text-danger"
                            disabled={u.id === me?.id || (u.role === 'admin' && u.id === me?.id)}
                            onClick={() => setDeleteTarget(u)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'permisos' && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs items={roleItems} value={roleId} onChange={selectRole} />
            <Button onClick={savePerms}>Guardar permisos</Button>
          </div>
          <p className="text-sm text-muted">
            Marca los módulos a los que puede acceder <strong className="text-night">{ROLE_LABEL[roleId] || roleId}</strong>.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {MODULE_PERMS.map((m) => {
              const on = permDraft.includes(m.id)
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${on ? 'border-brand bg-brand-soft' : 'border-line hover:bg-page'}`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-brand"
                    checked={on}
                    onChange={() => togglePerm(m.id)}
                  />
                  <span className="text-sm font-semibold text-night">{m.label}</span>
                </label>
              )
            })}
          </div>
        </Card>
      )}

      {formOpen && <UserFormModal onClose={() => setFormOpen(false)} onSubmit={onCreate} />}
      {editTarget && <UserFormModal initial={editTarget} onClose={() => setEditTarget(null)} onSubmit={onUpdate} />}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
        message={deleteTarget ? `¿Eliminar a ${deleteTarget.name}? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
