import { useState } from "react";

import { Field } from "@/components/ui";
import { cleanDateInput } from "@/lib/input";

// The native date picker has no web version; web is only used for local testing.
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string; // the form blocks saving a later date
}) {
  const [text, setText] = useState(value);
  return (
    <Field
      label={label}
      value={text}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      onChangeText={(raw) => {
        const t = cleanDateInput(raw);
        setText(t);
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) onChange(t);
      }}
    />
  );
}

// Reminders don't run on web, so this only has to exist for the shared Settings screen to load.
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <Field
      label={label}
      value={text}
      placeholder="HH:MM"
      maxLength={5}
      onChangeText={(t) => {
        setText(t);
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) onChange(t);
      }}
    />
  );
}
