"use client";

import { useState } from "react";

export function AddUserForm({ onAdded }: { onAdded: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");
      setSuccess(true);
      setEmail("");
      setName("");
      setPassword("");
      setRole("member");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-stone-200 bg-stone-50/50 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-stone-700">Add user</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            placeholder="Display name"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "admin")}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-emerald-600">User added.</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-lg bg-stone-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}
