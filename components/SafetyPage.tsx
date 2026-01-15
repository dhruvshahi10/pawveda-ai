import React from 'react';
import StaticPage from './StaticPage';

const SafetyPage: React.FC = () => {
  return (
    <StaticPage
      title="Safety Guidelines"
      subtitle="Quick safety reminders for responsible pet care."
    >
      <p>
        PawVeda insights are designed for everyday guidance. If your pet shows signs of distress, injury, or
        unusual behavior, contact a licensed veterinarian immediately.
      </p>
      <p>
        Always verify food, medication, and activity recommendations against your pet&apos;s unique health
        conditions, allergies, and vet guidance.
      </p>
      <p>
        Emergency services vary by city. Keep local vet and emergency clinic numbers saved and easily accessible.
      </p>
    </StaticPage>
  );
};

export default SafetyPage;
