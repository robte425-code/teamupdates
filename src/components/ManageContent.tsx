"use client";

import { UpdateForm } from "./UpdateForm";
import { KeyDateForm } from "./KeyDateForm";
import { AdminUsersSection } from "./AdminUsersSection";

export function ManageContent() {
  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        Manage content
      </h1>
      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-stone-800">
            Add update or reminder
          </h2>
          <UpdateForm onSaved={() => {}} />
        </section>
        <section>
          <h2 className="mb-4 text-lg font-semibold text-stone-800">
            Add key date
          </h2>
          <KeyDateForm onSaved={() => {}} />
        </section>
        <section>
          <AdminUsersSection />
        </section>
      </div>
    </>
  );
}
