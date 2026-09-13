import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Create Recruiter Account"
      subtitle="Join enterprise hiring teams using zero-bias agentic resume screening."
    >
      <RegisterForm />
    </AuthLayout>
  );
};
