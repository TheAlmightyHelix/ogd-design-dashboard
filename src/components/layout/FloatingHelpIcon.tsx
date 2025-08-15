import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import Dialog from './Dialog';

const FloatingHelpIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Floating Help Icon */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 left-6 z-40 hover:bg-blue-100  rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Modal */}
      <Dialog open={isOpen} onClose={handleClose}>
        <div className="space-y-4">
          <p className="text-gray-600">
            Welcome to the Open Game Data Dashboard! Here is a quick tutorial of
            how to use the app.
          </p>
          <div className="space-y-2">
            <div
              style={{
                position: 'relative',
                paddingBottom: '54.545454545454554%',
                height: '0',
              }}
            >
              <iframe
                src="https://www.loom.com/embed/de3cc8e32df44e5699b23f772cf7c602?sid=ad7ecaba-cd4f-4f2f-b286-a6e177f0b21f"
                frameBorder="0"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              ></iframe>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default FloatingHelpIcon;
