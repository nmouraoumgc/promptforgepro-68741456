import React from 'react';
import { create, act } from 'react-test-renderer';
import { describe, it, expect, vi } from 'vitest';
import { FirstPromptExamples } from '@/components/FirstPromptExamples';

describe('first prompt examples', () => {
  it.each([false, true])('offers three examples in the selected language and selects one', (english) => {
    const select = vi.fn();
    const view = create(<FirstPromptExamples isEnglish={english} onSelect={select} />);
    const buttons = view.root.findAllByType('button');
    expect(buttons).toHaveLength(3);
    act(() => buttons[0].props.onClick());
    expect(select).toHaveBeenCalledWith(expect.stringContaining(english ? 'property' : 'imóvel'));
  });
});
