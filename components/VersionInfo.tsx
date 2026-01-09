import React from 'react';

const VersionInfo: React.FC = () => {
  return (
    <div className="flex items-center h-full px-2 select-none">
      <div className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-gray-800 border border-gray-700 shadow-sm">
        v0.1.5 Alpha.2
      </div>
    </div>
  );
};

export default VersionInfo;