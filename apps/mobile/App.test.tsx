import { render, screen } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('opens on the missions list with the seeded demo missions and the safety statement', async () => {
    await render(<App />);
    expect(screen.getByRole('header', { name: 'AeroTrace' })).toBeTruthy();
    expect(screen.getByText('Riverfront survey')).toBeTruthy();
    expect(screen.getByText('Oceanário loop')).toBeTruthy();
    expect(screen.getByText(/Not flight-control software/)).toBeTruthy();
  });
});
