import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button, DeleteButton, EmptyState, ErrorText, Field, FormScrollView, IconPicker, Muted } from "@/components/ui";
import { deleteCategory, saveCategory } from "@/db/db";
import { CATEGORY_ICONS, type CategoryIcon, DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";
import { type Category, budgetFor, currentMonth } from "@/lib/ledger";
import { parseAmount, toInputString } from "@/lib/money";
import { useData } from "@/lib/use-data";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, data } = useData();
  if (!data?.currency) return null;
  const existing = data.categories.find((c) => String(c.id) === id);
  if (id !== "new" && !existing) return <EmptyState message="This category no longer exists." />;
  return <CategoryForm key={existing?.id ?? "new"} existing={existing} db={db} data={data} currency={data.currency} />;
}

function CategoryForm({
  existing,
  db,
  data,
  currency,
}: {
  existing: Category | undefined;
  db: ReturnType<typeof useData>["db"];
  data: NonNullable<ReturnType<typeof useData>["data"]>;
  currency: string;
}) {
  const month = currentMonth();
  const current = existing ? budgetFor(existing.id, month, data.budgets) : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState<CategoryIcon>(existing?.icon ?? DEFAULT_CATEGORY_ICON);
  const [budget, setBudget] = useState(current === null ? "" : toInputString(current, currency));
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/categories"));
  const amount = parseAmount(budget, currency);
  const canSave = name.trim() !== "" && amount !== null;
  const used = existing ? data.transactions.some((t) => t.category_id === existing.id) : false;

  async function save() {
    if (!name.trim()) return setError("Enter a name.");
    if (amount === null) return setError("Enter a valid monthly budget.");
    try {
      await saveCategory(db, { id: existing?.id, name, icon }, amount, month);
      close();
      toast(existing ? "Category updated" : "Category added");
    } catch (e) {
      setError(`Couldn't save: ${String(e)}`);
    }
  }

  async function remove() {
    if (!existing) return;
    if (used) return setError("This category has transactions, so it can't be deleted.");
    try {
      await deleteCategory(db, existing.id);
      close();
      toast("Category deleted");
    } catch (e) {
      setError(`Couldn't delete: ${String(e)}`);
    }
  }

  return (
    <FormScrollView>
      <Stack.Screen options={{ title: existing ? "Edit category" : "New category" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Food" />
      <IconPicker label="Icon" icons={CATEGORY_ICONS} value={icon} onChange={setIcon} />
      <Field
        label="Monthly budget"
        value={budget}
        onChangeText={setBudget}
        amount
      />
      <Muted>Resets every month. Changes apply from this month on; past months keep their budget.</Muted>
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} disabled={!canSave} />
      {existing &&
        (used ? <Muted>Categories with transactions can’t be deleted.</Muted> : <DeleteButton onConfirm={remove} />)}
    </FormScrollView>
  );
}
