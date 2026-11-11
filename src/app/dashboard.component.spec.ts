import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { createDashboardInspections, type DashboardInspection } from './dashboard-inspection-data';

class TestDashboard extends DashboardComponent {
  readonly charts = {
    records: this.completedChartInspections,
    months: this.inspectionChartMonths,
    results: this.inspectionResultsStackedChartData,
    reasons: this.reasonsForInspectionStackedChartData,
    scope: this.visibilityScope,
    categoryTotals: this.inspectionCategoryTotals,
    monthlyTotals: this.inspectionMonthlyTotals,
    visible: this.inspectionChartModalVisible,
    title: this.inspectionTotalsTableTitle,
  };

  openChart(kind: 'result' | 'reason'): void {
    this.openInspectionChartModal(kind);
  }
}

describe('Dashboard three-month inspection charts', () => {
  let dashboard: TestDashboard;
  const record = (
    completionDate: Date,
    result: DashboardInspection['result'],
    reason: DashboardInspection['reason'],
    maturity: DashboardInspection['maturity'],
    candidateType: DashboardInspection['candidateType'],
  ): DashboardInspection => ({ completionDate, result, reason, maturity, candidateType });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    TestBed.configureTestingModule({});
    dashboard = TestBed.runInInjectionContext(() => new TestDashboard());
    dashboard.charts.records.set([
      record(new Date(2025, 10, 1), 'Excellent', 'Change', 'New', 'Individual'),
      record(
        new Date(2025, 10, 30, 23, 59, 59),
        'Excellent',
        'Change',
        'Established',
        'Organization',
      ),
      record(new Date(2025, 11, 1), 'Good', 'ReExam', 'Established', 'Individual'),
      record(new Date(2026, 0, 31, 23, 59, 59), 'Marginal', 'Periodic', 'New', 'Organization'),
      record(new Date(2025, 9, 31, 23, 59, 59), 'Unsatisfactory', 'Original', 'New', 'Individual'),
      record(new Date(2026, 1, 1), 'Good', 'Reinstatement', 'Established', 'Organization'),
    ]);
  });

  afterEach(() => vi.useRealTimers());

  it('groups the current and two previous calendar months across a year boundary', () => {
    expect(dashboard.charts.results().labels).toEqual(['November', 'December', 'January']);
    expect(dashboard.charts.results().datasets).toHaveLength(10);
    expect(dashboard.charts.results().datasets.map((dataset) => dataset.stack)).toEqual([
      'Excellent',
      'Excellent',
      'Good',
      'Good',
      'Satisfactory',
      'Satisfactory',
      'Marginal',
      'Marginal',
      'Unsatisfactory',
      'Unsatisfactory',
    ]);
    expect(dashboard.charts.results().datasets.map((dataset) => dataset.data)).toEqual([
      [1, 0, 0],
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it('changes both chart stacks to candidate type without changing category totals', () => {
    dashboard.charts.scope.set('candidateType');
    expect(dashboard.charts.results().datasets[2].label).toBe('Good - Individual');
    expect(dashboard.charts.results().datasets[2].data).toEqual([0, 1, 0]);
    expect(dashboard.charts.results().datasets[3].data).toEqual([0, 0, 0]);
    expect(dashboard.charts.reasons().datasets[4].label).toBe('ReExam - Individual');
    expect(dashboard.charts.reasons().datasets[4].data).toEqual([0, 1, 0]);
    expect(dashboard.charts.categoryTotals().at(-1)?.counts).toEqual([2, 1, 0, 1, 0]);
  });

  it('opens each modal with exact category and monthly totals, without double counting groups', () => {
    dashboard.openChart('result');
    expect(dashboard.charts.visible()).toBe(true);
    expect(dashboard.charts.title()).toBe('Inspection Result Totals in Last 3 Months');
    expect(dashboard.charts.categoryTotals()).toEqual([
      { label: 'New', counts: [1, 0, 0, 1, 0] },
      { label: 'Established', counts: [1, 1, 0, 0, 0] },
      { label: 'Individual', counts: [1, 1, 0, 0, 0] },
      { label: 'Organization', counts: [1, 0, 0, 1, 0] },
      { label: 'Total', counts: [2, 1, 0, 1, 0] },
    ]);
    dashboard.openChart('reason');
    expect(dashboard.charts.title()).toBe('Inspection Reason Totals in Last 3 Months');
    expect(dashboard.charts.categoryTotals()).toEqual([
      { label: 'New', counts: [1, 0, 0, 0, 1] },
      { label: 'Established', counts: [1, 0, 1, 0, 0] },
      { label: 'Individual', counts: [1, 0, 1, 0, 0] },
      { label: 'Organization', counts: [1, 0, 0, 0, 1] },
      { label: 'Total', counts: [2, 0, 1, 0, 1] },
    ]);
    expect(dashboard.charts.monthlyTotals()).toEqual([
      { label: 'New', counts: [1, 0, 1] },
      { label: 'Established', counts: [1, 1, 0] },
      { label: 'Individual', counts: [1, 1, 0] },
      { label: 'Organization', counts: [1, 0, 1] },
      { label: 'Total', counts: [2, 1, 1] },
    ]);
  });

  it('keeps all categories and zero-valued table cells when there are no completions', () => {
    dashboard.charts.records.set([]);
    dashboard.openChart('reason');
    expect(
      dashboard.charts
        .reasons()
        .datasets.every((dataset) => dataset.data.every((count) => count === 0)),
    ).toBe(true);
    expect(
      dashboard.charts
        .categoryTotals()
        .every((row) => row.counts.length === 5 && row.counts.every((count) => count === 0)),
    ).toBe(true);
    expect(dashboard.charts.monthlyTotals().at(-1)?.counts).toEqual([0, 0, 0]);
  });

  it('seeds prototype records only within the three-month window and not after today', () => {
    const today = new Date();
    const records = createDashboardInspections(today);
    expect(records.length).toBeGreaterThan(0);
    expect(
      records.every(
        (inspection) =>
          inspection.completionDate >= new Date(2025, 10, 1) && inspection.completionDate <= today,
      ),
    ).toBe(true);
    expect(new Set(records.map((inspection) => inspection.completionDate.getMonth())).size).toBe(3);
  });
});
