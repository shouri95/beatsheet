'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    setTheme(newTheme);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleTheme}>
      Toggle Theme
    </Button>
  );
};

export default ThemeToggle;
