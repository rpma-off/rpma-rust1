import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoSave, useBeforeUnloadSave } from '@/shared/hooks/useAutoSave'
// eslint-disable-next-line no-restricted-imports -- test file needs direct mock access
import { useWorkflowStepAutoSave } from '@/domains/tasks/hooks/useWorkflowStepAutoSave'
// eslint-disable-next-line no-restricted-imports -- test file needs direct mock access
import { taskService } from '@/domains/tasks/services/task.service'

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

jest.mock('@/domains/tasks/services/task.service', () => ({
  taskService: {
    updateTaskStepData: jest.fn()
  }
}))

describe('useAutoSave', () => {
  let mockSaveFunction: jest.Mock
  let mockOnSave: jest.Mock
  let mockOnError: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSaveFunction = jest.fn()
    mockOnSave = jest.fn()
    mockOnError = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic Functionality', () => {
    it('returns initial status', () => {
      const { result } = renderHook(() =>
        useAutoSave({ test: 'data' }, mockSaveFunction)
      )

      expect(result.current).toEqual({
        saving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: null,
        forceSave: expect.any(Function)
      })
    })

    it('schedules save after delay when data changes', async () => {
      mockSaveFunction.mockResolvedValue(undefined)

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      expect(mockSaveFunction).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(30000) // 30 seconds
      })

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledWith({ test: 'changed' })
      })
    })

    it('calls onSave callback after successful save', async () => {
      mockSaveFunction.mockResolvedValue(undefined)

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction, { onSave: mockOnSave }),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ test: 'changed' })
      })
    })

    it('handles save errors', async () => {
      const error = new Error('Save failed')
      mockSaveFunction.mockRejectedValue(error)

      const { rerender, result } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction, { onError: mockOnError }),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Save failed')
        expect(mockOnError).toHaveBeenCalledWith(error)
      })
    })

    it('respects custom delay', () => {
      mockSaveFunction.mockResolvedValue(undefined)

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction, { delay: 5000 }),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      act(() => {
        jest.advanceTimersByTime(4000) // Less than 5 seconds
      })

      expect(mockSaveFunction).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(1000) // Total 5 seconds
      })

      expect(mockSaveFunction).toHaveBeenCalled()
    })

    it('saves immediately when immediate option is true', async () => {
      mockSaveFunction.mockResolvedValue(undefined)

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction, { immediate: true }),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledWith({ test: 'changed' })
      })
    })

    it('does not save when disabled', () => {
      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction, { enabled: false }),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('cancels previous timeout when data changes again', () => {
      mockSaveFunction.mockResolvedValue(undefined)

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed1' } })

      act(() => {
        jest.advanceTimersByTime(15000) // Half way
      })

      rerender({ data: { test: 'changed2' } })

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      // Should only save the latest data
      expect(mockSaveFunction).toHaveBeenCalledTimes(1)
      expect(mockSaveFunction).toHaveBeenCalledWith({ test: 'changed2' })
    })

    it('prevents concurrent saves', async () => {
      let resolveSave: (value: void) => void
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve
      })
      mockSaveFunction.mockReturnValue(savePromise)

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed1' } })
      rerender({ data: { test: 'changed2' } }) // This should not trigger another save

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      // Resolve the first save
      act(() => {
        resolveSave(undefined)
      })

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledTimes(1)
      })

      // Now the second change should trigger a save
      rerender({ data: { test: 'changed3' } })
      act(() => {
        jest.advanceTimersByTime(30000)
      })

      await waitFor(() => {
        expect(mockSaveFunction).toHaveBeenCalledTimes(2)
        expect(mockSaveFunction).toHaveBeenLastCalledWith({ test: 'changed3' })
      })
    })
  })

  describe('forceSave', () => {
    it('allows manual save', async () => {
      const { result } = renderHook(() =>
        useAutoSave({ test: 'data' }, mockSaveFunction)
      )

      mockSaveFunction.mockResolvedValue(undefined)

      await act(async () => {
        await result.current.forceSave()
      })

      expect(mockSaveFunction).toHaveBeenCalledWith({ test: 'data' })
    })

    it('updates status during manual save', async () => {
      const { result } = renderHook(() =>
        useAutoSave({ test: 'data' }, mockSaveFunction)
      )

      let resolveSave: (value: void) => void
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve
      })
      mockSaveFunction.mockReturnValue(savePromise)

      act(() => {
        result.current.forceSave()
      })

      await waitFor(() => {
        expect(result.current.saving).toBe(true)
      })

      act(() => {
        resolveSave(undefined)
      })

      await waitFor(() => {
        expect(result.current.saving).toBe(false)
      })

      expect(result.current.lastSaved).toBeInstanceOf(Date)
    })
  })

  describe('Status Updates', () => {
    it('marks hasUnsavedChanges when data changes', () => {
      const { rerender, result } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      expect(result.current.hasUnsavedChanges).toBe(false)

      rerender({ data: { test: 'changed' } })

      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('clears hasUnsavedChanges after successful save', async () => {
      mockSaveFunction.mockResolvedValue(undefined)

      const { rerender, result } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(false)
        expect(result.current.lastSaved).toBeInstanceOf(Date)
      })
    })

    it('sets error status on save failure', async () => {
      mockSaveFunction.mockRejectedValue(new Error('Save failed'))

      const { rerender, result } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      act(() => {
        jest.advanceTimersByTime(30000)
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Save failed')
        expect(result.current.saving).toBe(false)
      })
    })
  })

  describe('Cleanup', () => {
    it('clears timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      const { rerender, unmount } = renderHook(
        ({ data }) => useAutoSave(data, mockSaveFunction),
        { initialProps: { data: { test: 'initial' } } }
      )

      rerender({ data: { test: 'changed' } })

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})

describe('useWorkflowStepAutoSave', () => {
  const mockUpdateTaskStepData = taskService.updateTaskStepData as jest.Mock

  beforeEach(() => {
    mockUpdateTaskStepData.mockClear()
  })

  it('saves workflow step data', async () => {
    mockUpdateTaskStepData.mockResolvedValue({
      success: true,
      data: { success: true }
    })

    const { result } = renderHook(() =>
      useWorkflowStepAutoSave({ stepData: 'test' }, 'task-1', 'step-1')
    )

    await act(async () => {
      await result.current.forceSave()
    })

    expect(mockUpdateTaskStepData).toHaveBeenCalledWith(
      'task-1',
      'step-1',
      expect.objectContaining({
        stepData: 'test',
        updated_at: expect.any(String)
      })
    )
  })

  it('handles workflow save errors', async () => {
    mockUpdateTaskStepData.mockResolvedValue({
      success: false,
      error: 'Server error'
    })

    const { result } = renderHook(() =>
      useWorkflowStepAutoSave({ stepData: 'test' }, 'task-1', 'step-1')
    )

    await act(async () => {
      await result.current.forceSave()
    })

    expect(result.current.error).toContain('Erreur sauvegarde étape')
  })
})
describe('useBeforeUnloadSave', () => {
  let mockSaveFunction: jest.Mock
  let addEventListenerSpy: jest.SpyInstance
  let removeEventListenerSpy: jest.SpyInstance

  beforeEach(() => {
    mockSaveFunction = jest.fn().mockResolvedValue(undefined)
    addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('adds beforeunload listener when has unsaved changes', () => {
    renderHook(() =>
      useBeforeUnloadSave({ test: 'data' }, true, mockSaveFunction)
    )

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('removes listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useBeforeUnloadSave({ test: 'data' }, true, mockSaveFunction)
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('attempts emergency save on beforeunload', () => {
    renderHook(() =>
      useBeforeUnloadSave({ test: 'data' }, true, mockSaveFunction)
    )

    const beforeUnloadEvent = new Event('beforeunload')
    window.dispatchEvent(beforeUnloadEvent)

    expect(mockSaveFunction).toHaveBeenCalledWith({ test: 'data' })
  })

  it('does not attempt save when no unsaved changes', () => {
    renderHook(() =>
      useBeforeUnloadSave({ test: 'data' }, false, mockSaveFunction)
    )

    const beforeUnloadEvent = new Event('beforeunload')
    window.dispatchEvent(beforeUnloadEvent)

    expect(mockSaveFunction).not.toHaveBeenCalled()
  })
})

