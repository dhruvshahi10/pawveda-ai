import React from 'react';
import StaticPage from './StaticPage';

const TermsPage: React.FC = () => {
  return (
    <StaticPage
      title="Terms of Use"
      subtitle="Using PawVeda means you agree to the following MVP terms."
    >
      <p>
        PawVeda provides informational guidance for pet care and does not replace professional veterinary advice.
        You are responsible for decisions made based on the information provided.
      </p>
      <p>
        You agree to provide accurate account information and keep your login credentials secure. Misuse,
        unauthorized access, or attempts to disrupt the service may result in account suspension.
      </p>
      <p>
        Content, recommendations, and design are provided "as is" during the MVP phase and may change without
        notice as we improve accuracy, coverage, and availability.
      </p>
    </StaticPage>
  );
};

export default TermsPage;
