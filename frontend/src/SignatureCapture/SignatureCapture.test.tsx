import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SignatureCapture from './SignatureCapture';

const mockContext = {
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fillRect: jest.fn(),
  scale: jest.fn(),
  lineCap: 'round',
  lineJoin: 'round',
  strokeStyle: '#000000',
  lineWidth: 2,
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => mockContext,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/png;base64,mock',
});

describe('SignatureCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the signature capture UI', () => {
    render(<SignatureCapture />);

    expect(screen.getByLabelText('Signature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /effacer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer la signature/i })).toBeInTheDocument();
  });

  it('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<SignatureCapture />);

    await user.click(screen.getByRole('button', { name: /enregistrer la signature/i }));

    expect(screen.getByText('La signature est requise')).toBeInTheDocument();
    expect(screen.getByText('Le nom du client est requis')).toBeInTheDocument();
    expect(screen.getByText('Le nom du technicien est requis')).toBeInTheDocument();
    expect(screen.getByText('La conformité doit être vérifiée')).toBeInTheDocument();
  });

  it('calls onSignatureComplete when submission succeeds', async () => {
    const user = userEvent.setup();
    const onSignatureComplete = jest.fn();

    render(
      <SignatureCapture
        required={false}
        minSignatureLength={0}
        showClientName={false}
        showTechnicianName={false}
        showNotes={false}
        showConformityCheck={false}
        onSignatureComplete={onSignatureComplete}
      />
    );

    const canvas = screen.getByLabelText('Signature');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.mouseUp(canvas);

    await user.click(screen.getByRole('button', { name: /enregistrer la signature/i }));

    expect(onSignatureComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        signature: 'data:image/png;base64,mock',
      })
    );
  });
});
