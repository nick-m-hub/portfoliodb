'use client';
import { useEffect } from 'react';

export default function MaterialSymbolsActivator() {
  useEffect(() => {
    const el = document.getElementById('material-symbols-css');
    if (el) el.media = 'all';
  }, []);
  return null;
}
