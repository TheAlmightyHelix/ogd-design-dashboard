import React from 'react';
import Link from 'next/link';
import UserGuideDialog from './UserGuideDialog';

const TopBar: React.FC = () => {
  return (
    <header className="flex w-full items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
      <div></div>
      <div className="flex items-center gap-2">
        <Link
          href="https://opengamedata.fielddaylab.wisc.edu"
          target="_blank"
          aria-label="Visit Open Game Data Homepage"
          title="Visit Open Game Data Homepage"
        >
          <img
            src="/ogd/OGD-logotype-96.png"
            alt="Open Game Data"
            className="h-6 w-auto"
          />
        </Link>
        <span className="text-base font-medium">Visualization Dashboard</span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="https://github.com/opengamedata/ogd-designdash"
          target="_blank"
          aria-label="View project on GitHub"
          title="View project on GitHub"
        >
          <svg
            viewBox="0 0 24 24"
            fill="#333333"
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.744.082-.729.082-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.49 11.49 0 0112 5.8c1.02.005 2.045.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.874.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.622-5.48 5.92.43.37.823 1.102.823 2.222 0 1.606-.015 2.9-.015 3.293 0 .321.216.694.825.576C20.565 21.795 24 17.296 24 12c0-6.63-5.373-12-12-12z" />
          </svg>
        </Link>
        <UserGuideDialog />
      </div>
    </header>
  );
};

export default TopBar;
