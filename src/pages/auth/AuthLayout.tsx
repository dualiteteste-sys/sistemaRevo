import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import RevoLogo from '../../components/landing/RevoLogo';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-glass-200 backdrop-blur-xl border border-white/30 rounded-3xl shadow-glass-lg p-8">
          <div className="flex justify-center mb-8">
            <RevoLogo className="h-8 w-auto text-gray-800" />
          </div>
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;
