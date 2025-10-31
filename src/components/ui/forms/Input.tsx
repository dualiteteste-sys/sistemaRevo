import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  endAdornment?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, name, className, endAdornment, ...props }) => (
  <div className={className}>
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      <input
        id={name}
        name={name}
        {...props}
        className={`w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm ${endAdornment ? 'pr-12' : ''}`}
      />
      {endAdornment && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{endAdornment}</span>
        </div>
      )}
    </div>
  </div>
);

export default Input;
