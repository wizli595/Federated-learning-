import type { ClientConfig } from "../../services/api";
import { PROFILES, PROFILE_DESC } from "./profileMeta";

interface Props {
  form: ClientConfig;
  onChange: (form: ClientConfig) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AddClientForm({ form, onChange, onSubmit, onCancel }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-800/40">
        <h2 className="text-sm font-semibold text-zinc-200">New FL Client</h2>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition text-xs"
        >
          ✕
        </button>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">ID (slug)</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100
                       text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            placeholder="alice"
            value={form.id}
            onChange={(e) => onChange({
              ...form,
              id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
            })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Display Name</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100
                       text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            placeholder="Alice"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Spam Profile</label>
          <select
            className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100
                       text-sm focus:outline-none focus:border-blue-500"
            value={form.profile}
            onChange={(e) => onChange({ ...form, profile: e.target.value as any })}
          >
            {PROFILES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <p className="text-[10px] text-zinc-600 leading-snug">{PROFILE_DESC[form.profile]}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Number of Emails</label>
          <input
            type="number" min={50} max={2000}
            className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100
                       text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            value={form.num_emails}
            onChange={(e) => onChange({ ...form, num_emails: parseInt(e.target.value) || 300 })}
          />
        </div>
      </div>
      <div className="flex gap-2 px-5 pb-5">
        <button
          onClick={onSubmit}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
                     transition shadow-lg shadow-blue-900/20"
        >
          Create Client
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
