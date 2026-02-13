import { render, screen } from '@testing-library/react'

import { Button } from '@/components/ui/button'

test('renders asChild with a single element child', () => {
  render(
    <Button asChild>
      <label htmlFor="avatar-upload">Upload</label>
    </Button>
  )

  const label = screen.getByText('Upload')
  expect(label.tagName).toBe('LABEL')
  expect(label).toHaveAttribute('data-slot', 'button')
})
