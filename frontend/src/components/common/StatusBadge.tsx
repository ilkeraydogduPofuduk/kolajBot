import React from 'react';
import { STATUS_COLORS, STATUS_TEXTS } from '../../constants/index';

interface StatusBadgeProps {
  status: keyof typeof STATUS_COLORS;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

const statusTexts = {
  active: 'Aktif',
  inactive: 'Pasif',
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'sm'
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${STATUS_COLORS[status]} ${sizeClasses[size]}`}
    >
      {text || STATUS_TEXTS[status]}
    </span>
  );
};

export default StatusBadge;
