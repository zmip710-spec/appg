import React from 'react';
import { RecentTransactions } from './RecentTransactions';

export const SalesView: React.FC = () => {
  return (
    <div className="space-y-6">
      <RecentTransactions searchTerm="" />
    </div>
  );
};
