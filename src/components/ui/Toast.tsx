import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500',
  },
};

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
  const { icon: Icon, bg } = toastConfig[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`flex items-center justify-between w-full max-w-sm p-4 text-white ${bg} rounded-lg shadow-lg`}
    >
      <div className="flex items-center">
        <Icon className="w-6 h-6 mr-3" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <button onClick={onDismiss} className="ml-4 -mr-1 p-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
};

export default Toast;
