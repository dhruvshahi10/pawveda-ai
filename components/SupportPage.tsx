import React from 'react';
import StaticPage from './StaticPage';

const SupportPage: React.FC = () => {
  return (
    <StaticPage
      title="Support"
      subtitle="We are here to help with onboarding, product questions, or content corrections."
    >
      <p>
        For MVP support, email us at{' '}
        <a className="content-link" href="mailto:support@pawveda.ai">support@pawveda.ai</a>
        {' '}with a short description of the issue and a screenshot if possible.
      </p>
      <p>
        We typically respond within 1-2 business days. For urgent pet health concerns, please contact your vet
        or a local emergency clinic.
      </p>
    </StaticPage>
  );
};

export default SupportPage;
