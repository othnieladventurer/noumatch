import posthog from 'posthog-js';

posthog.init('phc_yAKvudYDsQ7xPEP4ryARseUgcV9eUpwvJySj6cefSmqE', {
  api_host: 'https://app.posthog.com',
  person_profiles: 'identified_only'
});

export default posthog;


