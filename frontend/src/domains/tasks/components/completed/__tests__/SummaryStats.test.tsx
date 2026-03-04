import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryStats } from '../SummaryStats';

describe('SummaryStats', () => {
  it('renders checklist progress without division-by-zero when checklistTotal is 0', () => {
    render(
      <SummaryStats
        checklistCompleted={0}
        checklistTotal={0}
        photoCount={0}
        zonesCount={0}
      />
    );

    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText('0% complété')).toBeInTheDocument();
  });

  it('renders correct checklist percentage when total is non-zero', () => {
    render(
      <SummaryStats
        checklistCompleted={3}
        checklistTotal={4}
        photoCount={5}
        zonesCount={2}
        duration="2h 30min"
      />
    );

    expect(screen.getByText('3/4')).toBeInTheDocument();
    expect(screen.getByText('75% complété')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders optional satisfaction and quality scores when provided', () => {
    render(
      <SummaryStats
        checklistCompleted={1}
        checklistTotal={1}
        photoCount={0}
        zonesCount={0}
        satisfaction={4}
        qualityScore={92}
      />
    );

    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });
});
