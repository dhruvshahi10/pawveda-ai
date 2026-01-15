import React from 'react';
import PublicShell from './PublicShell';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const StaticPage: React.FC<Props> = ({ title, subtitle, children }) => {
  return (
    <PublicShell title={title} subtitle={subtitle} kicker="PawVeda Policies">
      {children}
    </PublicShell>
  );
};

export default StaticPage;
