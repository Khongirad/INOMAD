'use client';

interface MigrationBannerProps {
  onMigrate: () => void;
  onDismiss?: () => void;
}

export function MigrationBanner({ onMigrate, onDismiss }: MigrationBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Upgrade to MPC Wallet
            </h3>
          </div>

          <p className="text-gray-700 mb-4 ml-11">
            Your wallet uses legacy encryption. Upgrade to our new MPC system for enhanced security and social recovery.
          </p>

          <div className="flex flex-wrap gap-4 ml-11">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Social Recovery
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No Single Point of Failure
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Enhanced Security
            </div>
          </div>

          <div className="flex gap-3 mt-4 ml-11">
            <button
              onClick={onMigrate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Upgrade Now
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Remind me later
              </button>
            )}
          </div>
        </div>

        <div className="ml-4">
          <div className="bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full">
            Recommended
          </div>
        </div>
      </div>
    </div>
  );
}
