'use client';

import { useState, useCallback } from 'react';
import CheckInCard from '@/components/CheckInCard';
import QuickAddForm from '@/components/QuickAddForm';
import TodayDocket from '@/components/TodayDocket';
import ReportPanel from '@/components/ReportPanel';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const docNo = `No. ${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
    today.getDate()
  ).padStart(2, '0')}`;

  return (
    <div className="sheet">
      <div className="crop tl"></div>
      <div className="crop tr"></div>
      <div className="crop bl"></div>
      <div className="crop br"></div>

      <header className="masthead">
        <h1 className="title">Work Ledger</h1>
        <div className="doc-meta">
          <div>{todayLabel}</div>
          <div>{docNo}</div>
        </div>
      </header>

      <section className="block">
        <div className="section-head">
          <h2 className="section-title">Today&apos;s Check-in</h2>
        </div>
        <CheckInCard refreshKey={refreshKey} bumpRefresh={bumpRefresh} />
      </section>

      <section className="block">
        <QuickAddForm bumpRefresh={bumpRefresh} />
      </section>

      <section className="block">
        <div className="section-head">
          <h2 className="section-title">Today&apos;s Docket</h2>
        </div>
        <TodayDocket refreshKey={refreshKey} bumpRefresh={bumpRefresh} />
      </section>

      <section className="block">
        <div className="section-head">
          <h2 className="section-title">Report</h2>
        </div>
        <ReportPanel refreshKey={refreshKey} />
      </section>

      <footer className="foot-note">Data stored in your own database — private to you.</footer>
    </div>
  );
}
