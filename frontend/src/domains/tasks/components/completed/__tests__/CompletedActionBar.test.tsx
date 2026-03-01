import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CompletedActionBar } from '../CompletedActionBar';

describe('CompletedActionBar', () => {
  it('calls JSON download callback', () => {
    const onDownloadDataJson = jest.fn();

    render(
      <CompletedActionBar
        onSaveReport={async () => {}}
        onDownloadDataJson={onDownloadDataJson}
        onShareTask={() => {}}
        onPrintReport={async () => {}}
        isExporting={false}
        exportProgress=""
        lastExportTime={null}
        taskId="task-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /JSON/i }));
    expect(onDownloadDataJson).toHaveBeenCalledTimes(1);
  });
});
