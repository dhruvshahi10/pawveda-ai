import React from 'react';
import StaticPage from './StaticPage';

const PrivacyPage: React.FC = () => {
  return (
    <StaticPage
      title="Privacy Policy"
      subtitle="A concise overview of how PawVeda handles data for the MVP."
    >
      <p>
        We collect only the information needed to create your account and personalize care guidance, such as
        your email, pet profile, and city. We do not sell your data.
      </p>
      <p>
        Usage analytics may be collected in aggregate to improve product quality and reliability. Any sensitive
        data you enter is used solely to deliver the requested experience.
      </p>
      <p>
        If you would like your data removed or exported, contact us at{' '}
        <a className="content-link" href="mailto:support@pawveda.ai">support@pawveda.ai</a>.
      </p>
    </StaticPage>
  );
};

export default PrivacyPage;
