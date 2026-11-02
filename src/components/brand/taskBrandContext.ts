import { createContext, useContext, useState } from 'react';
import { useBrandProfiles } from '@/data/brandDb';
export function useLocalTaskBrand() {
  const { active, profiles, isLoading } = useBrandProfiles();
  const [selection, setSelection] = useState<string | null | undefined>(undefined);
  const id = selection === undefined ? active?.id ?? null : selection;
  const brand = profiles.find(p => p.id === id) ?? null;
  return { brand, profiles, isLoading, setSelection, requestBrand: { brandId: brand?.id ?? null, useBrand: !!brand } };
}
export const TaskBrandContext = createContext<ReturnType<typeof useLocalTaskBrand> | null>(null);
export function useTaskBrand() {
  const shared = useContext(TaskBrandContext);
  const local = useLocalTaskBrand();
  return shared ?? local;
}
