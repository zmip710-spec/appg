import React from 'react';
import { RecentTransactions } from './RecentTransactions';

export const SalesView: React.FC = () => {
  return (
    <div className="space-y-6 pb-24 sm:pb-32">
      <RecentTransactions searchTerm="" />
    </div>
  );
};
