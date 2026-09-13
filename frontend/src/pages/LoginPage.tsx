import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to manage active candidate pipelines and review AI evidence reports."
    >
      <LoginForm />
    </AuthLayout>
  );
};
