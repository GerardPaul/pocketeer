import { useState } from "react";

import { Field } from "@/components/ui";

// The native date picker has no web version; web is only used for local testing.
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <Field
      label={label}
      value={text}
      placeholder="YYYY-MM-DD"
      onChangeText={(t) => {
        setText(t);
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) onChange(t);
      }}
    />
  );
}
