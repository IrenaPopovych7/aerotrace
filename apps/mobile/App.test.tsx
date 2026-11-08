import { render, screen } from '@testing-library/react-native';
import App from './App';

describe('App shell', () => {
  it('shows the product name and the safety statement', async () => {
    await render(<App />);
    expect(screen.getByRole('header', { name: 'AeroTrace' })).toBeTruthy();
    expect(screen.getByText(/Not flight-control software/)).toBeTruthy();
  });
});
