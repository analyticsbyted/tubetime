import { useState, useCallback } from 'react';

export const useSelection = () => {
  const [selection, setSelection] = useState(new Set());

  const toggle = useCallback((id) => {
    setSelection(prevSelection => {
      const newSelection = new Set(prevSelection);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const clear = useCallback(() => {
    setSelection(new Set());
  }, []);

  return { selection, toggle, clear };
};
