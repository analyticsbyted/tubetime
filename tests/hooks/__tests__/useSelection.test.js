import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSelection } from '@/hooks/useSelection';

describe('useSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selection.size).toBe(0);
  });

  it('should toggle selection', () => {
    const { result } = renderHook(() => useSelection());
    
    act(() => {
      result.current.toggle('video1');
    });
    expect(result.current.selection.has('video1')).toBe(true);
    
    act(() => {
      result.current.toggle('video1');
    });
    expect(result.current.selection.has('video1')).toBe(false);
  });

  it('should select all', () => {
    const { result } = renderHook(() => useSelection());
    const ids = ['video1', 'video2', 'video3'];
    
    act(() => {
      result.current.selectAll(ids);
    });
    expect(result.current.selection.size).toBe(3);
    ids.forEach(id => {
      expect(result.current.selection.has(id)).toBe(true);
    });
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useSelection());
    
    act(() => {
      result.current.selectAll(['video1', 'video2']);
    });
    expect(result.current.selection.size).toBe(2);
    
    act(() => {
      result.current.clear();
    });
    expect(result.current.selection.size).toBe(0);
  });

  it('should deselect all', () => {
    const { result } = renderHook(() => useSelection());
    
    act(() => {
      result.current.selectAll(['video1', 'video2']);
    });
    expect(result.current.selection.size).toBe(2);
    
    act(() => {
      result.current.deselectAll();
    });
    expect(result.current.selection.size).toBe(0);
  });
});

