import React from 'react';

const TopBar: React.FC = () => {
  return (
    <header className="flex w-full items-center justify-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
      <img
        src="/ogd/OGD-logotype-96.png"
        alt="Open Game Data"
        className="h-6 w-auto"
      />
      <span className="text-base font-medium">Visualization Dashboard</span>
    </header>
  );
};

export default TopBar;
