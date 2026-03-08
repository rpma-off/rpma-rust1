// Domain-level smoke test for the reports public API.
// Detailed tests live in subdirectories: hooks/__tests__, components/__tests__, services/__tests__.

import { reportsIpc } from '../ipc';
import { buildInterventionReportViewModel } from '../services';
import { PLACEHOLDERS } from '../services';

describe('reports domain public API', () => {
  it('exports reportsIpc', () => {
    expect(reportsIpc).toBeDefined();
    expect(typeof reportsIpc.generate).toBe('function');
    expect(typeof reportsIpc.getByIntervention).toBe('function');
  });

  it('exports buildInterventionReportViewModel', () => {
    expect(typeof buildInterventionReportViewModel).toBe('function');
  });

  it('exports PLACEHOLDERS constants', () => {
    expect(PLACEHOLDERS.notSpecified).toBe('Non renseigné');
    expect(PLACEHOLDERS.noObservation).toBe('Aucune observation');
    expect(PLACEHOLDERS.notEvaluated).toBe('Non évalué');
  });
});
