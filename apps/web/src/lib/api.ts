import ky from 'ky';

export const api = ky.create({
  prefixUrl: '/api/v1',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          try {
            await ky.post('/api/v1/auth/refresh', { credentials: 'include' });
            return ky(request, options);
          } catch {
            window.location.href = '/auth/login';
          }
        }
        return response;
      },
    ],
  },
});
